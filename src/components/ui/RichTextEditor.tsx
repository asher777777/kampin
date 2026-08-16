"use client";

import { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
// Removed unused firebase imports
// Removed unused lucide import
import 'jodit/es2021/jodit.min.css';

const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  className = "",
  placeholder
}: RichTextEditorProps) {
  const editor = useRef(null);

  const config = useMemo(() => ({
    readonly: false,
    placeholder: placeholder || 'התחל לכתוב...',
    direction: 'rtl' as 'rtl',
    language: 'he',
    minHeight: 400,
    style: {
      fontFamily: 'inherit',
    },
    uploader: {
      insertImageAsBase64URI: true, // fallback
    },
    events: {
      beforePaste: () => {
         // Allow default pasting with formats
         return true; 
      }
    },
    controls: {
      font: {
        list: {
          'var(--font-heebo), sans-serif': 'Heebo'
        }
      }
    },
    buttons: [
      'source', '|',
      'bold',
      'strikethrough',
      'underline',
      'italic', '|',
      'ul',
      'ol', '|',
      'outdent', 'indent',  '|',
      'font',
      'fontsize',
      'brush',
      'paragraph', '|',
      'image',
      'video',
      'table',
      'link', '|',
      'align', 'undo', 'redo', '|',
      'hr',
      'eraser',
      'copyformat', '|',
      'fullsize',
    ],
  }), [placeholder]);

  return (
    <div className={`w-full rounded-xl overflow-hidden flex flex-col bg-white ${className}`}>
      <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none w-full" dir="rtl">
        <JoditEditor
          ref={editor}
          value={value}
          config={config}
          onBlur={newContent => onChange(newContent)}
        />
      </div>
    </div>
  );
}
