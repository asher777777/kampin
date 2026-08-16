"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Loader2, Send, Square, Play, Pause, X } from "lucide-react";
import Image from "next/image";
import { processGatekeeperInteraction, VettingState } from "@/features/gatekeeper/actions";

interface ExecutiveInterviewProps {
  userName?: string;
  userId?: string;
}

interface Message {
  id: string;
  role: "ed" | "user";
  text: string;
  type?: "text" | "audio";
  audioUrl?: string;
}

export function ExecutiveInterview({ userName = "אורח", userId = "mock-user-id" }: ExecutiveInterviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [vettingState, setVettingState] = useState<VettingState>("GREETING");
  const [options, setOptions] = useState<string[]>([]);
  const [optionsType, setOptionsType] = useState<"buttons" | "diamonds" | undefined>(undefined);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [highlightInput, setHighlightInput] = useState(false);
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, options]);

  // Initial GREETING trigger
  useEffect(() => {
    const init = async () => {
      setIsProcessing(true);
      try {
        const response = await processGatekeeperInteraction(userId, "GREETING", "", userName);
        setVettingState(response.nextState);
        setOptions(response.options || []);
        setOptionsType(response.optionsType);
        
        const newMsg: Message = { id: Date.now().toString(), role: "ed", text: response.text };
        setMessages([newMsg]);
        playEdAudio(response.text);
      } catch (err) {
        console.error(err);
      }
      setIsProcessing(false);
    };
    init();
  }, [userId, userName]);

  const playEdAudio = async (text: string) => {
    try {
      const res = await fetch('http://localhost:8080/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.audioUrl && audioRef.current) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.play().catch(e => console.warn("Autoplay blocked"));
      }
    } catch (e) {
      console.warn("TTS failed", e);
    }
  };

  const handleOptionClick = (opt: string) => {
    if (opt === "אחר") {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      setHighlightInput(true);
      setTimeout(() => setHighlightInput(false), 1500);
    } else {
      handleSendText(opt);
    }
  };

  const handleSendText = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setOptions([]);
    setOptionsType(undefined);
    
    await submitToGatekeeper(text);
  };

  const submitToGatekeeper = async (transcript: string) => {
    setIsProcessing(true);
    try {
      const response = await processGatekeeperInteraction(userId, vettingState, transcript, userName);
      setVettingState(response.nextState);
      setOptions(response.options || []);
      setOptionsType(response.optionsType);
      
      const newMsg: Message = { id: Date.now().toString(), role: "ed", text: response.text };
      setMessages(prev => [...prev, newMsg]);
      playEdAudio(response.text);
    } catch (err) {
      console.error(err);
    }
    setIsProcessing(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied", err);
      alert("אין גישה למיקרופון. אנא אשר גישה בדפדפן.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const handleSendAudio = async () => {
    if (!recordedBlob) return;
    
    // Simulate STT for now, as we don't have a direct REST STT endpoint in server.js yet
    // In a real implementation, we'd POST the blob to /api/stt
    const fakeTranscript = "הקלטה קולית נשלחה (סימולציה, יש לחבר STT REST במערכת האמיתית)";
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: "user", 
      text: "🎙️ הודעה קולית", 
      type: "audio", 
      audioUrl: recordedUrl! 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setOptions([]);
    setOptionsType(undefined);
    
    // We send a hardcoded text to LLM since STT isn't processing the blob currently, 
    // or we can fallback to the web speech API. For now, we proceed.
    await submitToGatekeeper(fakeTranscript);
  };

  const cancelRecording = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const togglePreviewAudio = () => {
    if (previewAudioRef.current) {
      if (isPlaying) {
        previewAudioRef.current.pause();
      } else {
        previewAudioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // UI Components for Options
  const DiamondButton = ({ text, onClick, center }: { text: string, onClick: () => void, center?: boolean }) => (
    <button 
      onClick={onClick}
      className={`relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center cursor-pointer group transition-transform hover:scale-105 ${center ? 'z-20' : 'z-10'}`}
    >
      <div className="absolute inset-0 border-2 border-amber-500 rotate-45 group-hover:bg-amber-50 bg-white transition-colors shadow-sm" />
      <span className="relative z-10 font-bold text-amber-700 group-hover:text-amber-900 text-center text-sm leading-tight px-2">
         {text}
      </span>
    </button>
  );

  return (
    <div className="h-[100dvh] w-full bg-slate-50 flex flex-col overflow-hidden relative" dir="rtl" style={{ fontFamily: 'var(--font-heebo), sans-serif' }}>
      
      {/* Floating Page Header */}
      <div className="sticky top-0 z-30 pointer-events-none bg-slate-50/80 backdrop-blur-sm pb-4 pt-6 shrink-0 shadow-sm border-b border-slate-200/50">
        <div className="w-full flex justify-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#FFD700] drop-shadow-md">חדר קבלה</h1>
        </div>
      </div>

      {/* Background Dots Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none mt-12" style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 2px, transparent 2px)', backgroundSize: '30px 30px' }} />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex-1 flex flex-row justify-center items-end gap-12 p-4 md:p-8 overflow-hidden pointer-events-none">
        
        {/* Right Side: Ed Avatar (First in RTL) */}
        <div className="relative w-[30vw] max-w-[400px] h-[80vh] hidden md:flex items-end justify-center pointer-events-none shrink-0 -mb-8">
            <Image 
              src="/ad-talk.webp" 
              alt="Ed" 
              fill
              className="object-contain object-bottom drop-shadow-2xl"
              priority
            />
        </div>

        {/* Left Side: The Chat Frame */}
        <div className="w-full max-w-md h-full relative flex flex-col bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] overflow-hidden pointer-events-auto border border-slate-100 shrink-0">
            
            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar scroll-smooth">
              <div className="flex-1 min-h-[50px]" /> {/* Spacer to push initial messages down */}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'ed' ? 'items-start' : 'items-end'}`}>
                  <span className="text-xs font-bold text-slate-400 mb-1 px-2">{msg.role === 'user' ? 'אתה' : 'אד'}</span>
                  <div className={`
                    px-5 py-3 rounded-2xl max-w-[90%] text-sm md:text-base leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-slate-100 text-slate-700 rounded-tl-none' 
                      : 'bg-amber-50 text-amber-900 rounded-tr-none border border-amber-200 font-medium'}
                  `}>
                    {msg.type === 'audio' ? (
                      <div className="flex items-center gap-3">
                        {msg.text}
                        <audio controls src={msg.audioUrl} className="h-8 w-40" />
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex flex-col items-start">
                   <div className="px-5 py-3 rounded-2xl bg-amber-50 text-amber-900 rounded-tr-none border border-amber-200">
                     <Loader2 className="w-5 h-5 animate-spin" />
                   </div>
                </div>
              )}
              
              {/* Options Area (Buttons or Diamonds) */}
              {options.length > 0 && !isProcessing && (
                <div className="mt-4 flex justify-center w-full fade-in pb-4">
                  {optionsType === 'diamonds' && options.length >= 5 ? (
                    <div className="relative w-64 h-64 flex items-center justify-center my-4">
                      <div className="absolute top-0"><DiamondButton text={options[0]} onClick={() => handleOptionClick(options[0])} /></div>
                      <div className="absolute right-0"><DiamondButton text={options[1]} onClick={() => handleOptionClick(options[1])} /></div>
                      <div className="absolute bottom-0"><DiamondButton text={options[2]} onClick={() => handleOptionClick(options[2])} /></div>
                      <div className="absolute left-0"><DiamondButton text={options[3]} onClick={() => handleOptionClick(options[3])} /></div>
                      <div className="absolute z-20"><DiamondButton text={options[4]} center onClick={() => handleOptionClick(options[4])} /></div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-4">
                      {options.map((opt, i) => (
                         <button 
                            key={i} 
                            onClick={() => handleOptionClick(opt)}
                            className="px-6 py-2 border-2 border-amber-400 text-amber-700 font-bold rounded-full hover:bg-amber-50 transition-colors shadow-sm"
                          >
                           {opt}
                         </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div ref={chatEndRef} className="h-4" />
            </div>

            {/* Input Area (Sticky Footer) */}
            <div className="sticky bottom-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 z-20 shrink-0">
              
              {/* Recorded Audio Preview State */}
              {recordedUrl ? (
                 <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
                    <div className="flex items-center gap-4 w-full px-2">
                       <button onClick={togglePreviewAudio} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200">
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                       </button>
                       <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          {/* Fake progress bar for visual */}
                          <div className="h-full bg-amber-400 w-1/3 rounded-full" />
                       </div>
                       <span className="text-sm font-medium text-slate-500">{formatTime(recordingDuration)}</span>
                       <button onClick={cancelRecording} className="text-slate-400 hover:text-red-500">
                          <X className="w-5 h-5" />
                       </button>
                    </div>
                    <button 
                      onClick={handleSendAudio}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      <Send className="w-5 h-5 ml-1" />
                      שלח הודעה קולית
                    </button>
                    <audio 
                      ref={previewAudioRef} 
                      src={recordedUrl} 
                      onEnded={() => setIsPlaying(false)} 
                      className="hidden" 
                    />
                 </div>
              ) : isRecording ? (
                 /* Recording State */
                 <div className="flex flex-col items-center justify-center gap-3 w-full max-w-sm mx-auto animate-pulse-slow">
                    <span className="text-red-500 font-bold text-lg">{formatTime(recordingDuration)}</span>
                    <button 
                      onClick={stopRecording}
                      className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105"
                    >
                      <Square className="w-5 h-5 fill-current" />
                    </button>
                    <span className="text-sm text-red-400 font-medium">מקליט... הקלק לעצירה</span>
                 </div>
              ) : (
                 /* Default Text/Mic Input State */
                <div className="flex items-center justify-center gap-3 w-full max-w-sm mx-auto">
                  <div className="flex-1 relative">
                    <input 
                      ref={inputRef}
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendText(inputText)}
                      placeholder="כתוב הודעה או הקלט..."
                      className={`w-full bg-white border rounded-full py-3 px-5 pr-12 outline-none transition-all text-sm md:text-base text-slate-900 placeholder:text-slate-400 ${
                        highlightInput 
                          ? 'border-amber-500 ring-4 ring-amber-200 scale-105 shadow-lg' 
                          : 'border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100'
                      }`}
                    />
                    <button 
                      onClick={() => handleSendText(inputText)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${inputText.trim() ? 'bg-amber-500 text-white' : 'text-slate-300'}`}
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                  <button 
                    onClick={startRecording}
                    className="w-12 h-12 shrink-0 rounded-full border-2 border-amber-400 bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 hover:scale-105 transition-all shadow-sm"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

      <audio ref={audioRef} className="hidden" />
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .fade-in { animation: fadeIn 0.4s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-pulse-slow { animation: pulseSlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulseSlow { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }
      `}} />
    </div>
  );
}
