const { GoogleGenerativeAI } = require("@google/generative-ai");
const { generateEduReply } = require('./services/aiService');
require('dotenv').config();

async function testConnection() {
    console.log("--- EduReply API Test ---");

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.error("❌ ERROR: Gemini API Key is missing in .env file!");
        return;
    }

    const mockKnowledgeBase = [{ key: "Deadline", value: "Next Friday at 5 PM" }];
    const mockEmail = "Hi, when do I need to turn in the assignment?";

    try {
        console.log("Sending test request using 'gemini-2.5-flash-lite'...");
        const reply = await generateEduReply(mockEmail, mockKnowledgeBase);
        console.log("\n--- AI Response Received ---");
        console.log(reply);
        console.log("\n✅ Success! Your API key and model are working.");
    } catch (error) {
        console.error("\n❌ Request Failed!");
        console.error("Error Message:", error.message);
        console.log("\nTip: Make sure you ran 'npm install' after the recent changes.");
    }
}

testConnection();
