# Quotation MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-cabinet intelligent quotation MVP that implements PRD v1.2 formulas, validation, results rendering, Excel export, local history, and unit tests from an empty directory.

**Architecture:** Use a small React + TypeScript SPA with business logic isolated in `src/lib` and presentation in focused UI components. Keep all price calculation, validation, formatting, export mapping, and storage logic pure and separately testable so the UI only coordinates input, state, and rendering.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, SheetJS (`xlsx`)

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig*.json`
- Create: `vite.config.ts`
- Create: `src/*`
- Test: `src/test/setup.ts`

- [ ] Step 1: Scaffold a Vite React TypeScript app
- [ ] Step 2: Add test, DOM, and Excel dependencies
- [ ] Step 3: Add Vitest and test setup wiring

### Task 2: Core calculation domain

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/lib/types.ts`
- Create: `src/lib/quote.ts`
- Test: `src/lib/quote.test.ts`

- [ ] Step 1: Write failing tests for formula invariants and benchmark example
- [ ] Step 2: Run tests to verify red state
- [ ] Step 3: Implement minimal pure calculation helpers and breakdown output
- [ ] Step 4: Run tests to verify green state

### Task 3: Validation, formatting, and persistence

**Files:**
- Create: `src/lib/validation.ts`
- Create: `src/lib/format.ts`
- Create: `src/lib/history.ts`
- Test: `src/lib/validation.test.ts`
- Test: `src/lib/history.test.ts`

- [ ] Step 1: Write failing tests for required fields, numeric limits, soft warnings, and capped history
- [ ] Step 2: Run tests to verify red state
- [ ] Step 3: Implement validation, formatting, and local storage helpers
- [ ] Step 4: Run tests to verify green state

### Task 4: Excel export mapping

**Files:**
- Create: `src/lib/exportExcel.ts`
- Test: `src/lib/exportExcel.test.ts`

- [ ] Step 1: Write failing tests for exported worksheet rows and hidden-zero-row behavior
- [ ] Step 2: Run tests to verify red state
- [ ] Step 3: Implement workbook generation from the quote breakdown
- [ ] Step 4: Run tests to verify green state

### Task 5: UI assembly

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/*`
- Create: `src/styles.css`
- Test: `src/App.test.tsx`

- [ ] Step 1: Write failing UI tests for disabled generate state, result rendering, and history recall
- [ ] Step 2: Run tests to verify red state
- [ ] Step 3: Implement the form, summary, details table, warning, and export button
- [ ] Step 4: Run tests to verify green state

### Task 6: Final verification

**Files:**
- Modify: `README.md`

- [ ] Step 1: Add concise run/test instructions
- [ ] Step 2: Run `npm test`
- [ ] Step 3: Run `npm run build`
- [ ] Step 4: Check requirement coverage against PRD v1.2 before reporting completion
