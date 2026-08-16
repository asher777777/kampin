const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Set up Google Cloud Clients
// Note: Assumes GOOGLE_APPLICATION_CREDENTIALS environment variable is set
const speechClient = new speech.SpeechClient();
const ttsClient = new textToSpeech.TextToSpeechClient();

// REST API for TTS
app.post('/api/speak', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const request = {
      input: { text: text },
      voice: { languageCode: 'he-IL', name: 'he-IL-Neural2-A' }, // Using Neural2 for Hebrew if available, fallback to Wavenet
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    
    // Convert audio content to base64 to send it easily over API
    // (Or we could serve it as a static file, but base64 is simpler for this flow)
    const audioBase64 = Buffer.from(response.audioContent, 'binary').toString('base64');
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`;

    res.json({
      audioUrl: audioUrl,
      // For now, no viseme data since we use a static WebP, but we keep the structure
      visemeData: []
    });

  } catch (error) {
    console.error('Error in TTS:', error);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

// WebSocket for Real-time STT
wss.on('connection', (ws) => {
  console.log('Client connected for STT');
  let recognizeStream = null;

  const startStream = () => {
    const request = {
      config: {
        encoding: 'WEBM_OPUS', // Assuming client sends WebM Opus
        sampleRateHertz: 48000,
        languageCode: 'he-IL',
      },
      interimResults: true, // Get real-time transcription
    };

    recognizeStream = speechClient
      .streamingRecognize(request)
      .on('error', console.error)
      .on('data', data => {
        const result = data.results[0];
        if (result && result.alternatives[0]) {
          const transcript = result.alternatives[0].transcript;
          const isFinal = result.isFinal;
          ws.send(JSON.stringify({
            transcript,
            isFinal
          }));
        }
      });
  };

  ws.on('message', (message) => {
    // If it's a string, might be a control command
    if (typeof message === 'string') {
      const data = JSON.parse(message);
      if (data.action === 'start') {
        startStream();
      } else if (data.action === 'stop') {
        if (recognizeStream) {
          recognizeStream.end();
          recognizeStream = null;
        }
      }
    } else {
      // It's binary audio data
      if (recognizeStream) {
        recognizeStream.write(message);
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Gatekeeper backend listening on port ${PORT}`);
});
