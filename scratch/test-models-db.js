const { adminDb } = require('../src/lib/firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const docRef = adminDb.collection("settings").doc("ai");
    const docSnap = await docRef.get();
    let apiKey = "";
    if (docSnap.exists) {
      apiKey = docSnap.data().googleAiKey;
    }
    if (!apiKey) {
      console.log("No API key in DB.");
      return;
    }
    console.log("API Key loaded from DB:", apiKey.substring(0, 5) + "...");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const models = [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-3.1-pro-preview'
    ];
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const res = await model.generateContent("Say 'hello'");
        console.log(`Model ${m}: SUCCESS - ${res.response.text().trim()}`);
      } catch (err) {
        console.log(`Model ${m}: FAILED - ${err.message}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}
test();
