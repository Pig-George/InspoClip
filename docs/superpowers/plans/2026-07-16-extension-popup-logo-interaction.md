# Extension Popup Logo Interaction Implementation Plan

> **For AI implementation:** Execute in the current session without subagents. Follow TDD and verify before completion.

**Goal:** Remove the popup logo surface treatment and add a retriggerable, accessible click animation.

**Architecture:** Extract the logo interaction into a focused `BrandLogoButton` component. A click increments a render key so the CSS animation can restart without timers. CSS owns all motion and reduced-motion behavior.

**Tech stack:** React 18, TypeScript, CSS animations, Vitest, React DOM server rendering.

---

### Task 1: Define the logo control contract

**Files:**
- Create: `extension/src/popup/components/BrandLogoButton.test.ts`
- Create: `extension/src/popup/components/BrandLogoButton.tsx`

- [ ] Add a failing test requiring an accessible button, transparent-surface class, animation layer, and decorative sparkles.
- [ ] Run the focused test and confirm it fails because the component does not exist.
- [ ] Implement the smallest component with click-driven animation-key increment.
- [ ] Run the focused test and confirm it passes.

### Task 2: Integrate and style the interaction

**Files:**
- Modify: `extension/src/popup/components/Header.tsx`
- Modify: `extension/src/popup/style.css`

- [ ] Replace the static header image with `BrandLogoButton`.
- [ ] Remove the logo box shadow and define transparent button, rebound, sparkle, hover, focus, and reduced-motion styles.
- [ ] Run popup tests and TypeScript type checking.

### Task 3: Verify and deliver

**Files:**
- Build output: `extension/build/chrome-mv3-prod`

- [ ] Run the full extension test suite.
- [ ] Run `pnpm typecheck`.
- [ ] Run the Plasmo production build.
- [ ] Commit source changes to `develop` without pushing.

