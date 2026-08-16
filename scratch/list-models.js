const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Parse .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log("No API key found in env.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // We can list models by calling listModels
    // Note that @google/generative-ai might not have a direct listModels method on the client instance,
    // let's try fetch or API directly, or check standard model names.
    console.log("API Key loaded successfully.");
    
    // Let's test calling generateContent with a few standard names
    const modelsToTest = [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-3.1-pro',
      'gemini-3.1-pro-preview',
      'gemini-3.5-pro-preview',
      'gemini-3.5-flash'
    ];
    
    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const res = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'say hi' }] }],
          generationConfig: { maxOutputTokens: 5 }
        });
        console.log(`Model ${modelName}: SUCCESS`);
      } catch (err) {
        console.log(`Model ${modelName}: FAILED - ${err.message}`);
      }
    }
  } catch (err) {
    console.error("Error listing:", err);
  }
}

listModels();
