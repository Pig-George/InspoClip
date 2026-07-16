# Extension Analysis Button Sheen Implementation Plan

> **For AI implementation:** Execute in the current session without subagents. Follow TDD and verify before completion.

**Goal:** Apply the approved prototype sheen motion to the production popup analysis control.

**Architecture:** Keep the existing React markup unchanged. Use the analysis control pseudo-elements for the traveling highlight and outer glow, and animate the existing wand icon independently. The production CSS must match the approved 5.6 second fast-slow-fast timeline and retain the existing reduced-motion fallback.

**Tech stack:** CSS keyframes, React 18 markup, Vitest, TypeScript, Plasmo.

---

### Task 1: Lock the approved motion contract

**Files:**
- Create: `extension/src/popup/components/AnalysisButtonMotion.test.ts`

- [ ] Read the production popup stylesheet in a Vitest test.
- [ ] Assert the sheen pseudo-element, 5.6 second linear timeline, fast-slow-fast keyframe positions, glow animation, icon animation, and interactive z-index layers.
- [ ] Run the focused test and confirm it fails against the current production stylesheet.

### Task 2: Port the prototype styles

**Files:**
- Modify: `extension/src/popup/style.css`

- [ ] Add the sheen and glow pseudo-elements to `.analysis-control`.
- [ ] Add the approved 5.6 second motion keyframes.
- [ ] Keep both split-button controls above the decorative layers.
- [ ] Add the wand icon lift, sway, and rebound animation.
- [ ] Run the focused test and type checking.

### Task 3: Verify and deliver

**Files:**
- Build output: `extension/build/chrome-mv3-prod`

- [ ] Run the full extension test suite.
- [ ] Run `pnpm typecheck`.
- [ ] Run the Plasmo production build.
- [ ] Commit source changes to `develop` without pushing.

