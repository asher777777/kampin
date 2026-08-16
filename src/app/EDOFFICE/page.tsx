"use client";

import React, { useEffect, useRef, useState } from 'react';
import styles from './edoffice.module.css';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';

export default function EdOfficePage() {
  const [edMessage, setEdMessage] = useState("Hello, I am ED, the admissions interviewer. I have a few questions for you. Click the microphone or type below to begin.");
  const [userText, setUserText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [interactionId, setInteractionId] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setSessionId(`sess_${Date.now()}_${Math.random().toString(36).substring(7)}`);

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setUserText(currentTranscript); 
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleSend = async () => {
    if (!userText.trim()) return;
    
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    setIsThinking(true);
    setEdMessage(""); 

    try {
      const res = await fetch('/api/ed-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText,
          sessionId,
          previous_interaction_id: interactionId
        })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("API error response:", text);
        setEdMessage("Connection error: " + res.status + ". Check console.");
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Received non-JSON response:", text);
        setEdMessage("Server returned an invalid format. Check console.");
        return;
      }

      const data = await res.json();
      
      if (data.ttsError) {
        console.error("Backend TTS Error:", data.ttsError);
      }

      if (data.reply) {
        setEdMessage(data.reply);
        if (data.interactionId) {
          setInteractionId(data.interactionId);
        }
        if (data.audioBase64) {
          try {
            const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
            audio.play().catch(e => console.error("Audio playback blocked by browser:", e));
          } catch(err) {
             console.error("Audio play error", err);
          }
        }
      } else {
        setEdMessage("I'm sorry, I encountered an error. Could you repeat that?");
      }
    } catch (err) {
      console.error(err);
      setEdMessage("Connection error. Please try again.");
    } finally {
      setIsThinking(false);
      setUserText("");
    }
  };

  return (
    <div className={styles.container} dir="ltr" lang="en">
      <img 
        src="/edoffice/ed.webp" 
        alt="ED - Office Receptionist" 
        className={styles.edImage} 
      />

      <div className={styles.chatOverlay}>
        <div className={styles.edMessage}>
          {isThinking ? <Loader2 className="animate-spin text-white w-10 h-10 mx-auto" /> : edMessage}
        </div>

        <div className={styles.controlsContainer}>
          <div className={styles.inputGroup}>
            <textarea 
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Type or speak your answer here..."
              className={styles.textInput}
              disabled={isThinking}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {speechSupported && (
              <button 
                onClick={toggleRecording} 
                className={`${styles.micButton} ${isRecording ? styles.recording : ''}`}
                disabled={isThinking}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            )}
          </div>

          <button 
            onClick={handleSend} 
            className={styles.sendButton}
            disabled={isThinking || !userText.trim()}
          >
            Send <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
