import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIQuestion } from '../../schemas/ai-question.schema';
import { AIQuestionSet } from '../../schemas/ai-question-set.schema';

@Injectable()
export class AiLabService {
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectModel(AIQuestion.name) private aiQuestionModel: Model<AIQuestion>,
    @InjectModel(AIQuestionSet.name) private aiQuestionSetModel: Model<AIQuestionSet>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('geminiApiKey');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateQuestions(fileBuffer: Buffer, options: any, userId: string, instituteId: string) {
    const { subject, class: className, examName, mcqCount, cqCount, totalMarks, language, questionType, difficulty, time } = options;

    let textContent = '';
    try {
      if (fileBuffer && fileBuffer.length > 0) {
        textContent = await this.extractPdfText(fileBuffer);
      } else {
        textContent = 'Default academic content for ' + subject;
      }
    } catch (err) {
      console.warn('PDF Parse Error (using fallback):', err);
      textContent = 'Academic content about ' + subject + ' for Class ' + className;
    }

    let generatedData: { mcqs: any[], creatives: any[] } = { mcqs: [], creatives: [] };

    if (!this.genAI) {
      throw new InternalServerErrorException('AI Service is not configured. Please check your API key.');
    }

    const prompt = `
      Act as an expert ${subject} teacher for Class ${className}. 
      Based on the provided text content, generate an exam paper in ${language}.
      The exam name is "${examName}" and the total marks are ${totalMarks}.
      
      CRITICAL RULES:
      1. DO NOT generate placeholder, generic, or dummy content like "Sample Question" or "What is...?".
      2. Every question must be deeply relevant to the provided content.
      3. For Multiple Choice Questions (MCQ), provide 4 distinct, plausible options and identify the correct one.
      4. For Creative (Srijonshil) Questions, create a realistic scenario/stem followed by 4 parts (A, B, C, D) with increasing cognitive depth (Knowledge, Understanding, Application, Higher Order).
      5. Use professional academic tone in ${language}.
      
      Requirements:
      ${questionType !== 'CQ' ? `1. Generate ${mcqCount} Multiple Choice Questions (MCQ).` : ''}
      ${questionType !== 'MCQ' ? `2. Generate ${cqCount} Creative (Srijonshil) Questions.` : ''}
      3. Difficulty level: ${difficulty}.
      4. Language: ${language}. If ${language} is Bangla, ensure proper Bangla grammar, numerals and academic terminology.
      
      Content for reference:
      ---
      ${textContent.substring(0, 8000)} 
      ---
      
      Return the result strictly as a JSON object with this structure:
      {
        "mcqs": [
          { "text": "...", "options": ["Option 1", "Option 2", "Option 3", "Option 4"], "answer": "Option 1" }
        ],
        "creatives": [
          { 
            "scenario": "...", 
            "parts": { "A": "...", "B": "...", "C": "...", "D": "..." } 
          }
        ]
      }
    `;

    try {
      const parsed = await this.callAiWithFallback(prompt);
      generatedData = {
        mcqs: parsed.mcqs || [],
        creatives: parsed.creatives || []
      };
    } catch (err) {
      console.error('Gemini Fallback Failed:', err);
      throw new InternalServerErrorException('AI generation failed after multiple attempts. Please try again.');
    }

    // Combine questions for draft
    const allQuestions = [
      ...generatedData.mcqs.map(q => ({ content: q, type: 'MCQ' })),
      ...generatedData.creatives.map(q => ({ content: q, type: 'Creative' }))
    ];

    // Return as a draft object, NOT saved to DB
    return {
      instituteId,
      teacherId: userId,
      name: examName,
      subject,
      className,
      language,
      questionType,
      difficulty,
      time,
      totalMarks,
      questions: allQuestions,
      status: 'Draft',
    };
  }

  async getQuestionSets(instituteId: string, subject?: string) {
    const filter: any = { instituteId: new Types.ObjectId(instituteId) };
    if (subject) filter.subject = subject;
    return this.aiQuestionSetModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async deleteQuestionSet(id: string, instituteId: string) {
    return this.aiQuestionSetModel.findOneAndDelete({ 
      _id: new Types.ObjectId(id), 
      instituteId: new Types.ObjectId(instituteId) 
    }).exec();
  }

  async getQuestionSet(id: string, instituteId: string) {
    return this.aiQuestionSetModel.findOne({ 
      _id: new Types.ObjectId(id), 
      instituteId: new Types.ObjectId(instituteId) 
    }).exec();
  }

  async refineQuestionsDraft(draft: any, indicesToReplace: number[]) {
    const questionsToKeep = draft.questions.filter((_, i) => !indicesToReplace.includes(i));
    const questionsToReplace = draft.questions.filter((_, i) => indicesToReplace.includes(i));
    
    const mcqCount = questionsToReplace.filter(q => q.type === 'MCQ').length;
    const cqCount = questionsToReplace.filter(q => q.type === 'Creative').length;

    if (!this.genAI) {
      throw new InternalServerErrorException('AI Service is not configured. Please check your API key.');
    }

    const prompt = `
      Act as an expert ${draft.subject} teacher for Class ${draft.className}. 
      I have an existing exam paper, and I want to replace ${indicesToReplace.length} questions.
      
      CRITICAL RULES:
      1. DO NOT generate placeholder, generic, or dummy content.
      2. Every question must be deeply relevant and original.
      3. For Multiple Choice Questions (MCQ), provide 4 distinct, plausible options.
      4. For Creative (Srijonshil) Questions, ensure the scenario is realistic.
      5. Use professional academic tone in ${draft.language}.

      KEEP these questions (DO NOT REPEAT THEM):
      ${JSON.stringify(questionsToKeep.map(q => q.content.text || q.content.scenario))}
      
      GENERATE NEW questions to replace the old ones:
      1. Generate ${mcqCount} NEW Multiple Choice Questions (MCQ).
      2. Generate ${cqCount} NEW Creative (Srijonshil) Questions.
      3. Difficulty level: ${draft.difficulty}.
      4. Language: ${draft.language}.
      
      Return the result strictly as a JSON object with this structure:
      {
        "mcqs": [ { "text": "...", "options": ["Option 1", "Option 2", "Option 3", "Option 4"], "answer": "Option 1" } ],
        "creatives": [ { "scenario": "...", "parts": { "A": "...", "B": "...", "C": "...", "D": "..." } } ]
      }
    `;

    try {
      const parsed = await this.callAiWithFallback(prompt);
      const newQuestions = [
        ...(parsed.mcqs || []).map(q => ({ content: q, type: 'MCQ' })),
        ...(parsed.creatives || []).map(q => ({ content: q, type: 'Creative' }))
      ];

      // Replace at specific indices
      let mcqPointer = 0;
      let creativePointer = 0;
      const newDraftQuestions = [...draft.questions];
      
      const newMcqs = newQuestions.filter(q => q.type === 'MCQ');
      const newCreatives = newQuestions.filter(q => q.type === 'Creative');

      indicesToReplace.forEach(idx => {
        const originalType = draft.questions[idx].type;
        if (originalType === 'MCQ' && mcqPointer < newMcqs.length) {
          newDraftQuestions[idx] = newMcqs[mcqPointer++];
        } else if (originalType === 'Creative' && creativePointer < newCreatives.length) {
          newDraftQuestions[idx] = newCreatives[creativePointer++];
        }
      });

      draft.questions = newDraftQuestions;
      return draft;
    } catch (err) {
      console.error('Gemini Refinement Fallback Failed:', err);
      throw new InternalServerErrorException('Question regeneration failed. Please try again.');
    }
  }

  private async callAiWithFallback(prompt: string) {
    const models = [
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-2.0-flash',
      'gemini-3-pro-preview',
      'gemini-2.0-flash-lite'
    ];
    let lastError = null;

    for (const modelName of models) {
      try {
        console.log(`Trying model: ${modelName}...`);
        const model = this.genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { 
            responseMimeType: 'application/json',
            temperature: 0.7,
            topP: 0.8,
            topK: 40
          }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Robust JSON extraction
        let jsonStr = text;
        if (text.includes('```')) {
          const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (match && match[1]) {
            jsonStr = match[1];
          }
        }
        
        jsonStr = jsonStr.trim();
        
        // Sometimes the model might return text before/after the JSON even with application/json
        // Let's try to find the first '{' and last '}'
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }

        try {
          return JSON.parse(jsonStr);
        } catch (parseErr) {
          console.warn(`JSON Parse failed for ${modelName}:`, parseErr.message);
          console.debug('Problematic JSON string:', jsonStr);
          throw new Error('Invalid JSON response from AI');
        }
      } catch (err) {
        console.warn(`Model ${modelName} failed:`, err.message);
        lastError = err;
        // If it's a 429 (rate limit), we might want to wait or try a different model
        // but for now we just continue to the next model
      }
    }

    if (lastError) {
      if (lastError.status === 429 || lastError.message?.includes('429')) {
        throw new InternalServerErrorException('AI Service is currently rate-limited. Please wait a moment and try again.');
      }
      if (lastError.status === 404 || lastError.message?.includes('404')) {
        throw new InternalServerErrorException('AI Model not found or unavailable. Please contact support.');
      }
    }
    
    throw new InternalServerErrorException('AI generation failed after multiple attempts with all available models.');
  }

  async saveFinalizedSet(draft: any, userId: string, instituteId: string) {
    const questionSet = await new this.aiQuestionSetModel({
      ...draft,
      instituteId: new Types.ObjectId(instituteId),
      teacherId: new Types.ObjectId(userId),
      status: 'Finalized',
    }).save();

    return questionSet;
  }

  private async extractPdfText(fileBuffer: Buffer) {
    const pdfParseModule = await import('pdf-parse');
    const PDFParse = pdfParseModule.PDFParse;
    const parser = new PDFParse({ data: fileBuffer });
    const result = await parser.getText();
    return result.text;
  }

}
