const fs = require('fs');
if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n');
  for (const line of envConfig) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  }
}

const { google } = require('googleapis');

async function testWithCorrectScopes() {
  const privateKeyB64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;
  let privateKey = "";
  if (privateKeyB64) {
    privateKey = Buffer.from(privateKeyB64, "base64").toString("utf8");
  }
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  const jwtClient = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/generative-language",
      "https://www.googleapis.com/auth/generative-language.retriever",
      "https://www.googleapis.com/auth/cloud-platform"
    ],
  });

  const tokens = await jwtClient.getAccessToken();
  const freshAccessToken = tokens.token;
  console.log("Generated OAuth2 token with generative-language scope:", freshAccessToken.substring(0, 15) + "...");

  // Test models with GenerativeLanguage API using generative-language scope
  const testModels = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"];
  for (const model of testModels) {
    try {
      const genLangUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const glRes = await fetch(genLangUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${freshAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello Gemini, reply in 1 word: 'CONNECTED'." }] }]
        })
      });
      console.log(`Model ${model} Status:`, glRes.status);
      const glData = await glRes.json();
      if (glRes.ok) {
        console.log(`SUCCESS [${model}]:`, glData.candidates?.[0]?.content?.parts?.[0]?.text);
      } else {
        console.log(`FAIL [${model}]:`, JSON.stringify(glData));
      }
    } catch (e) {
      console.error(`Fetch error for ${model}:`, e);
    }
  }
}

testWithCorrectScopes();
