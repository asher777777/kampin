"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, FileUp, Sparkles, AlertCircle, FileText, Loader2 } from "lucide-react";
import { speechToText } from "../actions";

interface RawInputStepProps {
  onNext: (data: { text: string; fileBase64?: string; fileType?: string; fileName?: string }) => void;
  isLoading: boolean;
}

export default function RawInputStep({ onNext, isLoading }: RawInputStepProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  
  // File upload state
  const [fileBase64, setFileBase64] = useState<string | undefined>(undefined);
  const [fileType, setFileType] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Waveform visualization animation state
  const [waveBars, setWaveBars] = useState<number[]>(Array(15).fill(10));
  const animationRef = useRef<number | null>(null);

  // Simulate audio waveform animation when recording
  useEffect(() => {
    if (isRecording) {
      const updateWave = () => {
        setWaveBars(prev => prev.map(() => Math.floor(Math.random() * 35) + 5));
        animationRef.current = requestAnimationFrame(updateWave);
      };
      animationRef.current = requestAnimationFrame(updateWave);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setWaveBars(Array(15).fill(10));
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording]);

  // Voice recording handlers
  const startRecording = async () => {
    setAudioError("");
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setAudioLoading(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        // Stop all stream tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const res = await speechToText(base64, "audio/webm");
            
            if (res.success && res.text) {
              setText(prev => (prev ? prev + "\n" + res.text : res.text || ""));
            } else {
              setAudioError(res.error || "נכשל בפענוח ההקלטה הקולית");
            }
          } catch (err: any) {
            setAudioError("שגיאה בעיבוד האודיו");
          } finally {
            setAudioLoading(false);
          }
        };
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access error:", err);
      setAudioError("אין גישה למיקרופון. אנא אשר הרשאות בדפדפן.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setAudioError("הקובץ גדול מדי. הגבול המירבי הוא 10MB.");
      return;
    }

    setFileName(file.name);
    setFileType(file.type);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      setFileBase64(base64);
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setAudioError("הקובץ גדול מדי. הגבול המירבי הוא 10MB.");
        return;
      }
      setFileName(file.name);
      setFileType(file.type);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        setFileBase64(base64);
      };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !fileBase64) {
      setAudioError("אנא הזן רעיון או העלה מסמך כדי להתחיל.");
      return;
    }
    onNext({
      text: text.trim(),
      fileBase64,
      fileType,
      fileName
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-black border border-[#f59e0b]/20 p-8 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.05)] text-right transition-colors duration-300" dir="rtl">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-full bg-[#f59e0b]/10 flex items-center justify-center border border-[#f59e0b]/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] mb-4">
          <Sparkles className="w-8 h-8 text-[#f59e0b] drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">איסוף חומרי הגלם</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-md">
          זרוק לכאן את הרעיון שלך בצורה חופשית. המחולל יבצע את העבודה הקשה ויארגן ממנו סדר ומבנה.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Free text input with floating label concept */}
        <div className="relative group">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading || audioLoading}
            rows={5}
            className="w-full bg-white dark:bg-black border border-[#f59e0b]/40 rounded-xl p-4 text-zinc-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-[#f59e0b] focus:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all resize-none text-right font-sans"
            placeholder="תאר את הפרויקט שלך... (לדוגמה: יריד התנדבות בעוד חודשיים עם 50 דוכנים ותקציב של 20 אלף שקלים)"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            {/* Audio Recording Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || audioLoading}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isRecording
                  ? "bg-red-950 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                  : "bg-zinc-100 dark:bg-zinc-900 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
              }`}
              title={isRecording ? "עצור הקלטה" : "הקלט רעיון בקולך"}
            >
              {audioLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Recording Visual Waveform & status */}
        {isRecording && (
          <div className="flex flex-col items-center py-4 bg-[#f59e0b]/5 border border-[#f59e0b]/10 rounded-xl animate-pulse">
            <p className="text-xs text-[#f59e0b] mb-2 font-mono">מקליט כעת... לחץ שוב לעצירה</p>
            <div className="flex items-center gap-1 h-10">
              {waveBars.map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-[#f59e0b] rounded-full transition-all duration-75"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* File Drag and Drop / Uploader */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-[#f59e0b]/20 hover:border-[#f59e0b]/50 bg-zinc-100/40 dark:bg-zinc-950/40 rounded-xl p-6 text-center cursor-pointer transition-colors group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <FileUp className="w-8 h-8 text-[#f59e0b]/60 group-hover:text-[#f59e0b] transition-colors" />
            {fileName ? (
              <div className="flex items-center gap-2 text-[#f59e0b]">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-semibold truncate max-w-xs">{fileName}</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">גרור קובץ לכאן או לחץ להעלאה</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">תומך ב-PDF, Word או קבצי טקסט עד 10MB</p>
              </>
            )}
          </div>
        </div>

        {/* Error notification */}
        {audioError && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/20 border border-red-500/20 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{audioError}</span>
          </div>
        )}

        {/* Action button */}
        <button
          type="submit"
          disabled={isLoading || audioLoading || isRecording}
          className="w-full flex items-center justify-center gap-2 bg-[#f59e0b] text-black font-semibold py-3.5 px-6 rounded-xl hover:bg-[#d97706] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>המחולל מתניע...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>התחל חילול</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
