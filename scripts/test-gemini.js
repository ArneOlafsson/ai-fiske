const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function testGemini() {
    console.log("Testing Gemini API...");

    if (!process.env.GEMINI_API_KEY) {
        console.error("ERROR: GEMINI_API_KEY is not set in .env.local");
        return;
    }

    console.log("API Key found (length: " + process.env.GEMINI_API_KEY.length + ")");

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using gemini-2.5-flash as 1.5 seems deprecated/unavailable
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = "Explain what a fish is in one sentence.";

        console.log("Sending prompt: " + prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("SUCCESS! Response from Gemini:");
        console.log(text);
    } catch (error) {
        console.error("FAILURE: API Call failed.");
        console.error(error.message);
    }
}

testGemini();
