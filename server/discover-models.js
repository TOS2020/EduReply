const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    console.log("--- EduReply Model Discovery ---");
    const key = process.env.GEMINI_API_KEY;

    // Standard AI Studio keys are 39 chars.
    console.log(`Using API Key: ${key.substring(0, 4)}...${key.substring(key.length - 4)} (Length: ${key.length})`);

    try {
        // We'll use a direct fetch to the Google API discover models endpoint
        // because the SDK's listModels can be tricky in older versions.
        const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", data.error.message);
            return;
        }

        console.log("\n✅ Models available to your key:");
        data.models.forEach(m => {
            console.log(`- ${m.name.split('/').pop()} (${m.displayName})`);
        });

        console.log("\nCopy one of the names above to use in your app!");
    } catch (err) {
        console.error("❌ Connection Error:", err.message);
        console.log("Tip: Check if you are behind a firewall or proxy.");
    }
}

listModels();
