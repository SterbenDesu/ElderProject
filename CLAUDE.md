Read AGENTS.md before any task. All rules there are mandatory.

Read PROJECT_BRIEF.md to understand the product vision before making any structural decisions.

# CLAUDE.md

## Tech Stack

- **Framework:** Next.js 14+
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase
- **Deployment:** Vercel

## Languages

The app supports two languages: **English** (default) and **Bulgarian**.

All user-facing strings must go through the translation system in `lib/translations/`. Never hardcode copy directly into components.

## Deployment

Vercel auto-deploys on every push to `main`. Never break the build.

## Branching

Always work on a `claude/` prefixed branch. Never commit directly to `main`.

## Design Reference

Visual reference: **buddyguard.bg** — match its level of warmth, polish, and human feel. Every UI decision should be measured against that standard.

---

### Design & Aesthetic Rules

Never use: Inter, Roboto, Open Sans, Lato, Arial, or system default fonts.
Never use: generic purple-on-white gradients, flat grey cards, cold blue buttons.
Never use: three equal-width feature cards in a row as the only layout pattern.
Always use: warm amber, cream, and soft terracotta tones. Palette reference: #F5EFE6, #C4752A, #2C1A0E, #F9F4EE.
Always use: a distinctive Google Font pairing. For headings: Fraunces, Bricolage Grotesque, or Newsreader. For body: Source Sans 3 or Space Grotesk.
Always use: scroll-triggered fade or slide-in animations on sections. Hover effects on all interactive elements.
The visual reference is buddyguard.bg. Every UI decision should be measured against that standard of warmth and polish.
State your font choice explicitly before writing any component code.

---

## Design & Aesthetic Rules

Claude Code must follow these rules on every frontend task without exception.

### Anti-patterns — never use these
- Fonts: Inter, Roboto, Open Sans, Lato, Arial, or any system default font
- Colors: generic purple-on-white gradients, flat grey cards, white backgrounds with blue buttons
- Layout: three equal-width feature cards in a row, generic hero with centered text and two buttons
- Animations: none, or CSS transitions under 200ms
- Icons: emoji as UI elements, or no icons at all

### Required approach
- Typography: choose one distinctive font from Google Fonts. For this project the aesthetic is warm, trustworthy, human — good choices are Fraunces, Bricolage Grotesque, Newsreader, or Lora for headings, paired with Source Sans 3 or Space Grotesk for body.
- Color: warm amber, cream, and soft terracotta tones. Reference: #F5EFE6, #C4752A, #2C1A0E, #F9F4EE. Never use cold blues or corporate greys as primary colors.
- Motion: every section should fade or slide in on scroll. Buttons should have a subtle scale or color shift on hover. Cards should lift with a soft shadow on hover.
- Imagery: warm photography tones. If using placeholders, use warm gradient backgrounds not grey boxes.
- The reference site for aesthetic quality is buddyguard.bg — match that level of visual polish and human warmth.

### Typography scale
- Headlines: 3x size jumps minimum. Never 400 vs 600 weight — use 200 vs 800.
- Display text should feel editorial, not corporate.
- State your font choice before writing any component code.
