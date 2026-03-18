const { GoogleGenerativeAI } = require("@google/generative-ai");
const { generateEduReply } = require('./services/aiService');
require('dotenv').config();

async function runDiagnostic() {
    console.log("--- EduReply API Diagnostic ---");

    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') {
        console.error("❌ ERROR: Gemini API Key is missing in .env file!");
        return;
    }

    console.log(`API Key detected (length: ${key.length})`);
    const genAI = new GoogleGenerativeAI(key);

    console.log("\n1. Testing 'gemini-1.5-flash'...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Say hello");
        console.log("✅ Result:", result.response.text());
    } catch (err) {
        console.error("❌ gemini-1.5-flash failed:", err.message);
    }

    console.log("\n2. Testing 'gemini-pro'...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Say hello");
        console.log("✅ Result:", result.response.text());
    } catch (err) {
        console.error("❌ gemini-pro failed:", err.message);
    }

    console.log("\n3. Testing 'gemini-1.5-flash-latest'...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent("Say hello");
        console.log("✅ Result:", result.response.text());
    } catch (err) {
        console.error("❌ gemini-1.5-flash-latest failed:", err.message);
    }
}

runDiagnostic();
