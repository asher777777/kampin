---
name: design-system
description: Design System and Branding Guidelines (Golden Flute) - Must be followed for all UI/UX implementations in this project.
---

# Design System and Branding - Golden Flute

## Brand Identity
The design concept draws inspiration from a noble and mysterious character named "Michael" who holds a golden flute. The overall look conveys luxury, magic, and elegance through the use of deep colors, touches of gold and light (stardust), and luxurious minimalism. 
Michael serves as the user's "coach", guiding and directing them personally. He always explains the meaning and importance of every step. The communication is always in the first person, and tailored specifically to the user's gender.

## Design Guidelines

### 1. Colors and Backgrounds
- **Primary Brand Color:** A vibrant golden-amber (`amber-500` / `#f59e0b`). Used for focus, headers, active icons, field titles (labels), and field borders.
- **Background:** Deep Black.
- **Fields (Text):** Pure white text for the answers inside the fields, ensuring high contrast against the black background.
- **Typography Colors:** Pure white.
- **State Colors:** Errors will be displayed in red, and successes in green.
- **Icons:** Always in gold (`amber-500`), with a subtle glow effect.

### 2. Typography
- **Single Font:** `Heebo` (from Google Fonts) exclusively.

### 3. Layout & Structure
- **Single Column Only:** The layout must always be stacked row by row on all screens (desktop and mobile). Never 2 columns.
- **Focus Mode:** At any given moment, only one item or step is displayed. 
- **Empty States:** Screens without data will not just be empty. Michael will appear to guide the user and explain the importance of filling out the data in a detailed and instructive manner.

### 4. Shapes and Animations
- **Animations:** All transitions in the system will have an elegant, round, and soft character (Smooth & Elegant).
- **Border Radius:** All system elements (fields, cards, tabs) will be gently rounded (not pill-shaped or fully rounded).

### 5. Fields, Buttons, and Forms
- **Gradual Progress (1 Question Per Step):** Forms must strictly contain exactly **1 field per step**, with a maximum of 5 fields total per form. Once the user saves or answers, the current tab closes and the next one opens automatically.
- **Auto-Advance Logic:** 
  - Selecting an option in a selection box automatically advances the user to the next step (no scrolling needed).
  - Pressing the `Enter` key inside a text field automatically advances the user to the next step.
- **Selection Boxes:**
  - Vertical display only (row by row).
  - No standard radio buttons or checkboxes.
  - Selection is made by clicking, which activates a gold-illuminated border.
- **Field Styling:** All fields (text and selection) have a permanent gold border. The titles (labels) are gold, and the input text is white.
- **Floating Labels:** When free text fields receive focus, the placeholder text will float upwards in a soft animation simulating "a sound coming out of a flute".
- **Integrated Checkout:** The checkout and payment screen is seamlessly integrated into the form layout (matching the dark theme and gold accents) rather than opening as a separate pop-up.
- **Actions, Saving, and System Messages:**
  - The save icon is exclusively a **Folder** (no "Save" text).
  - White folder = Waiting to be saved (unsaved changes).
  - Gold folder (`amber-500`) = Saved successfully.
  - **System Messages (Toasts/Alerts):** There will be no floating text labels! Success/error indication will occur solely through the flashing or color change of the relevant folder icon.

---

## Open Questions - Round 3 (Advanced UX)

1. **Sound Design:** Since the branding is about a "Golden Flute" and sounds (like the floating text), would you like to integrate subtle sound effects (audio micro-interactions) in the system? For example: a gentle magical sound upon successful save, or a soft sliding sound when switching tabs?
2. **Loading States:** When a user enters the dashboard and waits for data to download from the server (standard data fetching), how should we display the wait? A spinning flute icon? Or a blinking skeleton loader of the upcoming content?
3. **Navigation:** In a system with many screens, how will the user navigate? A dark sidebar accompanying them on desktop, or a bottom navigation bar like in mobile apps?
4. **Light Mode:** Will the system be available exclusively in dark mode (Deep Black) to maintain the luxury of gold, or are you planning a light visual mode for users who prefer it?
5. **Mobile UI:** On mobile, when Michael needs to explain something important (like on an empty screen or in help), should his explanation come up from the bottom as a Bottom Sheet that can be swiped down to close, or appear as static text within the page?
