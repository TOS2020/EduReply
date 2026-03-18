const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyzes the student's email to determine intent and generate a response based on the knowledge base.
 * @param {string} studentEmailBody - The content of the incoming email.
 * @param {Array} knowledgeBase - The list of keywords/data provided by the teacher.
 * @param {string} teacherIdentity - The name/email of the teacher to sign the reply.
 */
async function generateEduReply(studentEmailBody, knowledgeBase, teacherIdentity) {
  // Using the standard model name. Ensure the SDK is up to date.
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
    You are an AI assistant for a teacher (${teacherIdentity}). Your goal is to help answer student questions based ONLY on the provided Knowledge Base.
    
    Knowledge Base:
    ${JSON.stringify(knowledgeBase, null, 2)}
    
    Student's Email:
    "${studentEmailBody}"
    
    Instructions:
    1. Scan the email for intent (e.g., questions about deadlines, reading lists, exam dates, or asking for a specific article/paper).
    2. If the student is asking for a specific article or copy of a paper, set "isArticleRequest" to true and "articleQuery" to the name of the article.
    3. Draft a polite and helpful reply. If the answer is NOT in the Knowledge Base, politely inform the student that you don't have that information right now, but will get back to them.
    4. Keep the tone professional and supportive.
    5. Always sign the email with "Best regards, ${teacherIdentity}".
    
    Output ONLY a JSON object with the following structure:
    {
      "reply": "the full email body text",
      "isArticleRequest": boolean,
      "articleQuery": "string or null"
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    // Clean up potential markdown formatting from AI
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", text);
    return { reply: text, isArticleRequest: false, articleQuery: null };
  }
}

module.exports = { generateEduReply };
