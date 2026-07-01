import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { AIQuestion } from '../../schemas/ai-question.schema';
import { AIQuestionSet } from '../../schemas/ai-question-set.schema';
import { Institute } from '../../schemas/institute.schema';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

@Injectable()
export class AiLabService {
  private genAI: GoogleGenerativeAI;
  private groq: any;
  private openai: OpenAI;

  constructor(
    @InjectModel(AIQuestion.name) private aiQuestionModel: Model<AIQuestion>,
    @InjectModel(AIQuestionSet.name) private aiQuestionSetModel: Model<AIQuestionSet>,
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('geminiApiKey');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      this.groq = new Groq({ apiKey: groqApiKey });
    }
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
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

    if (!this.genAI && !process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
      throw new InternalServerErrorException('Service is not configured. Please contact support.');
    }

    const institute = await this.instituteModel.findById(instituteId);
    const activeProvider = institute?.aiProvider || process.env.ACTIVE_AI_PROVIDER || 'groq';

    let allMcqs = [];
    let allCreatives = [];

    let remainingMcq = questionType !== 'CQ' ? (parseInt(mcqCount) || 0) : 0;
    let remainingCq = questionType !== 'MCQ' ? (parseInt(cqCount) || 0) : 0;

    const BATCH_MCQ = 20;
    const BATCH_CQ = 5;

    while (remainingMcq > 0 || remainingCq > 0) {
      const currentMcq = Math.min(remainingMcq, BATCH_MCQ);
      const currentCq = Math.min(remainingCq, BATCH_CQ);
      
      const prompt = `
        Act as an expert ${subject} teacher for Class ${className}. 
        Based on the provided text content, generate an exam paper in ${language}.
        The exam name is "${examName}".
        
        CRITICAL RULES:
        1. DO NOT generate placeholder, generic, or dummy content like "Sample Question" or "What is...?".
        2. Every question must be deeply relevant to the provided content.
        3. For Multiple Choice Questions (MCQ), provide 4 distinct, plausible options and identify the correct one.
        4. For Creative (Srijonshil) Questions, create a realistic scenario/stem followed by 4 parts (A, B, C, D) with increasing cognitive depth (Knowledge, Understanding, Application, Higher Order).
        5. Use professional academic tone in ${language}.
        6. IMPORTANT FOR MATH/SCIENCE: All mathematical expressions, fractions, formulas, and symbols MUST be wrapped in LaTeX delimiters. DO NOT use plain text or unicode for math (like x^2 or a²).
           - EXTREMELY IMPORTANT: DO NOT EVER generate HTML tags, XML, or KaTeX spans (e.g., <span class="katex">). ONLY output pure, raw source LaTeX math.
           - EXTREMELY IMPORTANT: Because you are generating JSON, you MUST double-escape ALL backslashes in LaTeX so they survive JSON parsing.
           - CORRECT: \\\\( x^2 + y^2 = 25 \\\\)  |  INCORRECT: \\( x^2 + y^2 = 25 \\)
           - CORRECT: \\\\( \\\\frac{1}{2}mv^2 \\\\)  |  INCORRECT: \\( \\frac{1}{2}mv^2 \\)
           - CORRECT: \\\\( \\\\sec^2 \\\\theta - \\\\tan^2 \\\\theta = 1 \\\\)  |  INCORRECT: \\( \\sec^2 \\theta - \\tan^2 \\theta = 1 \\)
           - CORRECT: \\\\( a^0 \\\\)  |  INCORRECT: a^0
        
        Requirements:
        ${currentMcq > 0 ? `1. Generate ${currentMcq} Multiple Choice Questions (MCQ).` : ''}
        ${currentCq > 0 ? `2. Generate ${currentCq} Creative (Srijonshil) Questions.` : ''}
        3. Difficulty level: ${difficulty}.
        4. Language: ${language}. If ${language} is Bangla, ensure proper Bangla grammar, numerals and academic terminology.
        
        Content for reference:
        ---
        ${textContent.substring(0, 8000)} 
        ---
        
        Return the result strictly as a JSON object with this structure:
        {
          "analysis": "A brief analysis of the core concepts in the provided text...",
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
        let parsed;
        if (activeProvider === 'openai') {
          parsed = await this.callOpenAi(prompt);
        } else if (activeProvider === 'groq') {
          parsed = await this.callGroqAi(prompt);
        } else {
          parsed = await this.callAiWithFallback(prompt);
        }
        if (parsed.mcqs) allMcqs.push(...parsed.mcqs);
        if (parsed.creatives) allCreatives.push(...parsed.creatives);
      } catch (err) {
        console.error('AI Generation Batch Failed:', err.message || err);
        if (allMcqs.length === 0 && allCreatives.length === 0) {
          if (err instanceof InternalServerErrorException) {
            throw err;
          }
          throw new InternalServerErrorException('Failed to generate questions. Please try again later.');
        } else {
          // If we got some questions in previous chunks, just return them instead of failing completely.
          console.warn('Returning partial data due to batch failure.');
          break; 
        }
      }

      remainingMcq -= currentMcq;
      remainingCq -= currentCq;
      
      // Delay for API rate limits if there are more chunks
      if ((remainingMcq > 0 || remainingCq > 0) && activeProvider === 'groq') {
         await new Promise(res => setTimeout(res, 2500));
      }
    }

    // Combine questions for draft
    const allQuestions = [
      ...allMcqs.map(q => ({ content: q, type: 'MCQ' })),
      ...allCreatives.map(q => ({ content: q, type: 'Creative' }))
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

  async getQuestionSets(instituteId: string, subject?: string, page: number = 1, limit: number = 10) {
    const filter: any = { instituteId: new Types.ObjectId(instituteId) };
    if (subject) {
      filter.$or = [
        { subject: { $regex: subject, $options: 'i' } },
        { name: { $regex: subject, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.aiQuestionSetModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.aiQuestionSetModel.countDocuments(filter).exec()
    ]);

    return { data, total, page, limit };
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

  async refineQuestionsDraft(draft: any, indicesToReplace: number[], instituteId?: string) {
    const questionsToKeep = draft.questions.filter((_, i) => !indicesToReplace.includes(i));
    const questionsToReplace = draft.questions.filter((_, i) => indicesToReplace.includes(i));
    
    const mcqCount = questionsToReplace.filter(q => q.type === 'MCQ').length;
    const cqCount = questionsToReplace.filter(q => q.type === 'Creative').length;

    if (!this.genAI) {
      throw new InternalServerErrorException('Service is not configured. Please contact support.');
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
      6. IMPORTANT FOR MATH/SCIENCE: All mathematical expressions, fractions, formulas, and symbols MUST be wrapped in LaTeX delimiters. DO NOT use plain text or unicode for math (like x^2 or a²).
         - EXTREMELY IMPORTANT: DO NOT EVER generate HTML tags, XML, or KaTeX spans (e.g., <span class="katex">). ONLY output pure, raw source LaTeX math.
         - EXTREMELY IMPORTANT: Because you are generating JSON, you MUST double-escape ALL backslashes in LaTeX so they survive JSON parsing.
         - CORRECT: \\\\( x^2 + y^2 = 25 \\\\)  |  INCORRECT: \\( x^2 + y^2 = 25 \\)
         - CORRECT: \\\\( \\\\frac{1}{2}mv^2 \\\\)  |  INCORRECT: \\( \\frac{1}{2}mv^2 \\)
         - CORRECT: \\\\( \\\\sec^2 \\\\theta - \\\\tan^2 \\\\theta = 1 \\\\)  |  INCORRECT: \\( \\sec^2 \\theta - \\tan^2 \\theta = 1 \\)
         - CORRECT: \\\\( a^0 \\\\)  |  INCORRECT: a^0

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
      let activeProvider = process.env.ACTIVE_AI_PROVIDER || 'groq';
      if (instituteId) {
        const institute = await this.instituteModel.findById(instituteId);
        if (institute && institute.aiProvider) {
          activeProvider = institute.aiProvider;
        }
      }

      let parsed;
      if (activeProvider === 'openai') {
        parsed = await this.callOpenAi(prompt);
      } else if (activeProvider === 'groq') {
        parsed = await this.callGroqAi(prompt);
      } else {
        parsed = await this.callAiWithFallback(prompt);
      }
      
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
      if (err instanceof InternalServerErrorException) {
        throw err;
      }
      throw new InternalServerErrorException('An unexpected error occurred while refining questions. Please try again later.');
    }
  }

  private async callAiWithFallback(prompt: string) {
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b'
    ];
    let lastError = null;

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        analysis: { type: SchemaType.STRING },
        mcqs: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              text: { type: SchemaType.STRING },
              options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              answer: { type: SchemaType.STRING }
            },
            required: ["text", "options", "answer"]
          }
        },
        creatives: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              scenario: { type: SchemaType.STRING },
              parts: {
                type: SchemaType.OBJECT,
                properties: {
                  A: { type: SchemaType.STRING },
                  B: { type: SchemaType.STRING },
                  C: { type: SchemaType.STRING },
                  D: { type: SchemaType.STRING }
                },
                required: ["A", "B", "C", "D"]
              }
            },
            required: ["scenario", "parts"]
          }
        }
      },
      required: ["analysis", "mcqs", "creatives"]
    };

    for (const modelName of models) {
      try {
        console.log(`Trying model: ${modelName}...`);
        const model = this.genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { 
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.7,
            topP: 0.8,
            topK: 40
          }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Robust JSON parsing: remove potential markdown formatting
        text = text.replace(/```json\n?|```\n?/g, '').trim();
        
        return JSON.parse(text);
      } catch (err) {
        console.warn(`Model ${modelName} failed. Exact Error:`, err.message, err.response?.text?.());
        lastError = err;
        
        // If it's a 429 (rate limit) or quota issue, wait 2 seconds before trying the next model
        if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Quota')) {
           await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (lastError) {
      console.error('All AI generation attempts failed. Final exact error:', lastError.message, lastError.response?.text?.());
      if (lastError.status === 429 || lastError.message?.includes('429') || lastError.message?.includes('Quota')) {
        throw new InternalServerErrorException('Service is currently experiencing high demand. Please try again in a few moments.');
      }
      if (lastError.status === 404 || lastError.message?.includes('404')) {
        throw new InternalServerErrorException('Service is temporarily unavailable. Please try again later.');
      }
    }
    
    throw new InternalServerErrorException('We are unable to process your request at this time. Please try again later.');
  }

  private async callGroqAi(prompt: string) {
    if (!this.groq) {
      throw new InternalServerErrorException('Groq is not configured. Please add GROQ_API_KEY in .env.');
    }
    try {
      console.log('Trying Groq model: llama-3.3-70b-versatile...');
      const completion = await this.groq.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert academic teacher. You must output strictly valid JSON. First, analyze the core concepts and include an "analysis" string in your JSON. Then, you MUST generate BOTH "mcqs" (Multiple Choice Questions) and "creatives" (Creative/Srijonshil Questions) if requested. Never return an empty array for creatives if the prompt asks for them. Always strictly follow the JSON schema provided in the prompt.' 
          },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        max_completion_tokens: 8000,
      });
      let text = completion.choices[0]?.message?.content || '{}';
      
      // Robust JSON parsing: remove potential markdown formatting
      text = text.replace(/```json\n?|```\n?/g, '').trim();
      
      return JSON.parse(text);
    } catch (err) {
      console.error('Groq Generation Failed:', err.message || err);
      if (err.status === 429 || err.message?.includes('429')) {
        throw new InternalServerErrorException('Groq is currently experiencing high demand. Please try again in a few moments.');
      }
      if (err instanceof SyntaxError || err.message?.includes('JSON')) {
        throw new InternalServerErrorException('Request too large. The AI hit its output limit before finishing (usually happens for large amounts of questions in Bangla). Please reduce mcq/cq counts.');
      }
      throw new InternalServerErrorException('Failed to generate with Groq. Please try again later.');
    }
  }

  private async callOpenAi(prompt: string) {
    if (!this.openai) {
      throw new InternalServerErrorException('OpenAI is not configured. Please add OPENAI_API_KEY in .env.');
    }
    try {
      console.log('Trying OpenAI model: gpt-4o-mini...');
      const completion = await this.openai.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert academic teacher. You must output strictly valid JSON. First, analyze the core concepts and include an "analysis" string in your JSON. Then, you MUST generate BOTH "mcqs" (Multiple Choice Questions) and "creatives" (Creative/Srijonshil Questions) if requested. Never return an empty array for creatives if the prompt asks for them. Always strictly follow the JSON schema provided in the prompt.' 
          },
          { role: 'user', content: prompt }
        ],
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
      });
      let text = completion.choices[0]?.message?.content || '{}';
      
      text = text.replace(/```json\n?|```\n?/g, '').trim();
      return JSON.parse(text);
    } catch (err) {
      console.error('OpenAI Generation Failed:', err.message || err);
      if (err instanceof SyntaxError || err.message?.includes('JSON')) {
        throw new InternalServerErrorException('Request too large. The AI hit its output limit before finishing. Please reduce mcq/cq counts.');
      }
      throw new InternalServerErrorException('Failed to generate with OpenAI. Please try again later.');
    }
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
