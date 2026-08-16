"use client";

import React, { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import JoditEditor to avoid SSR issues
const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false });

interface HebrewEmailEditorProps {
  value: string;
  onChange: (content: string) => void;
}

export function HebrewEmailEditor({ value, onChange }: HebrewEmailEditorProps) {
  const editor = useRef(null);

  // Configuration for Jodit
  const config = useMemo(() => ({
    readonly: false,
    direction: 'rtl' as const,
    language: 'he',
    toolbarSticky: false,
    minHeight: 400,
    showCharsCounter: false,
    showWordsCounter: false,
    showXPathInStatusbar: false,
    buttons: [
      'bold',
      'italic',
      'underline',
      'strikethrough',
      '|',
      'ul',
      'ol',
      '|',
      'font',
      'fontsize',
      'brush',
      'paragraph',
      '|',
      'image',
      'video',
      'table',
      'link',
      '|',
      'align',
      'undo',
      'redo',
      '|',
      'hr',
      'eraser',
      'source'
    ],
    uploader: {
      insertImageAsBase64URI: true // Simple setup for embedding images inline
    }
  }), []);

  return (
    <div className="w-full h-full min-h-[400px]" dir="rtl">
      <JoditEditor
        ref={editor}
        value={value}
        config={config}
        onBlur={newContent => onChange(newContent)} // preferred to use only this option to update the content for performance reasons
        onChange={newContent => {}}
      />
    </div>
  );
}
