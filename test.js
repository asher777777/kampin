const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envFile.match(/GEMINI_API_KEY=(.*)/);
process.env.GEMINI_API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : '';
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

async function run() {
  try {
    const response = await ai.interactions.create({
      model: 'gemini-3.6-flash', 
      input: 'Please respond with a JSON object: {"hello": "world"}',
    });
    require('fs').writeFileSync('test_resp.json', JSON.stringify(response, null, 2));
    console.log("Success!");
  } catch (e) {
    console.error(e.message);
  }
}
run();
