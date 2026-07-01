const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
async function test() {
  const prompt = `
    Act as an expert physics teacher for Class 10.
    Based on the provided text content, generate an exam paper in Bangla.
    
    CRITICAL RULES:
    1. DO NOT EVER generate HTML tags, XML, or KaTeX spans (e.g., <span class="katex">). ONLY output pure, raw source LaTeX math.
    2. Because you are generating JSON, you MUST double-escape ALL backslashes in LaTeX.
    
    Content:
    "Energy of an object is E = 1/2 m v^2. Find the energy."
    
    Generate 1 MCQ.
  `;
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' }
  });
  console.log(completion.choices[0].message.content);
}
test();
