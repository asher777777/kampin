const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");

const envLines = fs.readFileSync('.env.local', 'utf8').split('\n');
for (const line of envLines) {
  if (line.startsWith('GEMINI_API_KEY=')) {
    process.env.GEMINI_API_KEY = line.split('=')[1].trim();
  }
}

const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey) {
  console.log("No GEMINI_API_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({
  httpOptions: { headers: { Authorization: `Bearer ${geminiKey}` } },
});

async function main() {
  try {
    const res = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: "Hello world"
    });
    console.log("SUCCESS:", res);
  } catch (e) {
    console.error("ERROR:", e);
    console.error("ERROR JSON:", JSON.stringify(e, null, 2));
  }
}

main();
