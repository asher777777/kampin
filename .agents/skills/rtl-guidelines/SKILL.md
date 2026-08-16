---
name: rtl-guidelines
description: Best practices for handling RTL (Right-To-Left) Hebrew text combined with English/LTR text to prevent text direction issues.
---

# RTL (Right-To-Left) and BiDi (Bidirectional) Text Guidelines

When generating code, writing UI text, or writing documentation for this project, you must handle RTL (Hebrew) and LTR (English/Code) mixed text carefully so the text direction and punctuation do not get corrupted.

## Best Practices for UI Development (React / Next.js)

1. **Use `dir="rtl"` on containers**: Ensure that the main container or document `<html>` tag has the `dir="rtl"` attribute.
2. **Isolate English words in Hebrew sentences**: When inserting an English word, a number, or code inside a Hebrew sentence, it can mess up the text flow and punctuation. 
    * Wrap the LTR word in a tag with `dir="ltr"` or use the CSS property `unicode-bidi: isolate;` if needed.
    * *Example*: `<p>לחץ על כפתור ה- <span dir="ltr" className="inline-block">Submit</span> כדי לשמור.</p>`
3. **Punctuation placement (The BiDi Bug)**: A very common issue in mixed text is punctuation (like `.`, `!`, `?`) appearing on the wrong side (the right side) when a sentence ends with an English word. 
    * *Solution*: Add a Right-To-Left Mark (RLM) `&rlm;` (or `\u200F` in JS strings) after the English word and the punctuation.
    * *Example*: `<p>השגיאה התקבלה מה-API.&rlm;</p>`
4. **Logical CSS Properties**: Prefer logical CSS properties over physical ones to align with modern RTL development.
    * Use `margin-inline-start` instead of `margin-right` (in RTL, start is right).
    * Use `padding-inline-end` instead of `padding-left`.
    * Use `text-align: start` instead of `text-align: right`.
5. **Tailwind CSS**: Use logical utility classes!
    * Use `ms-2` (margin-start) instead of `mr-2` (margin-right).
    * Use `pe-4` (padding-end) instead of `pl-4` (padding-left).
    * Use `text-start` instead of `text-right`.

## Markdown and Documentation

When writing Markdown files containing mixed Hebrew and English:
1. Keep inline code blocks (like `code`) clearly separated from Hebrew words.
2. If punctuation moves to the start of the line incorrectly, append an RLM character (`&rlm;`) at the end of the line.
