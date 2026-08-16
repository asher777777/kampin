# Global Rules for Golden Flute Project

1. **Strict RTL & BiDi Compliance**: Always consider RTL (Right-To-Left) rendering. Use logical CSS properties (`margin-inline-start`, `padding-inline-end`). When writing Hebrew text mixed with English, isolate the English words or use `&rlm;` to ensure punctuation and layout do not break.
2. **Follow the Design System**: Always follow the `design-system` skill. Use the Golden Flute branding (amber-500, deep black, Heebo font, white text, smooth rounded corners).
3. **Form Experience**: Forms must display 1 question per step with auto-advance logic. The save icon is always a folder (never text).
4. **Chat Communication (RTL)**: When communicating with the user in Hebrew in this chat, ensure the text is formatted properly for RTL interfaces. Use `<div dir="rtl">` or `&rlm;` to prevent layout corruption caused by LTR markdown rendering.
