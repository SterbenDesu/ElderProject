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
