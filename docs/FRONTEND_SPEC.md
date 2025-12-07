# iCattle Ramp AI - Frontend Specification

**Version:** 1.0  
**Date:** December 7, 2025  
**Status:** Ready for Implementation

---

## Executive Summary

This document provides the concrete front-end spec for Ramp AI:

1. A small, consistent design system (layout, typography, chips, badges) so the app feels cohesive
2. Exact React component boundaries + props for each major screen
3. Tailwind class patterns you can standardise on so multiple devs can build without UI drift

**If your team follows this, you can split work across devs and still end up with a clean, ramp-first product that matches the flows we've already defined.**

---

## 1. Design System Primitives

Use these as shared building blocks.

### 1.1 Layout

**Page shell:** full-height, mobile-first

```typescript
export function PageShell({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400">
            iCattle
          </span>
          <h1 className="text-base font-semibold">{title}</h1>
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-800" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-3">{children}</main>
    </div>
  );
}
```

**Section header:**

```typescript
export function SectionHeader({ 
  title, 
  subtitle 
}: { 
  title: string; 
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
```

### 1.2 Status Chip

```typescript
type RunStatus = "DRAFT" | "CAPTURING" | "PROCESSING" | "REVIEW" | "CONFIRMED";

export function StatusChip({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { label: string; classes: string }> = {
    DRAFT: { label: "Draft", classes: "bg-slate-800 text-slate-200" },
    CAPTURING: { label: "Capturing", classes: "bg-sky-500/10 text-sky-400" },
    PROCESSING: { label: "Processing", classes: "bg-amber-500/10 text-amber-400" },
    REVIEW: { label: "Review", classes: "bg-indigo-500/10 text-indigo-400" },
    CONFIRMED: { label: "Confirmed", classes: "bg-emerald-500/10 text-emerald-400" },
  };

  const { label, classes } = map[status];

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${classes}`}>
      {label}
    </span>
  );
}
```

### 1.3 Stat Pill

```typescript
export function StatPill({ 
  label, 
  value 
}: { 
  label: string; 
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-xs font-semibold text-slate-100">{value}</span>
    </div>
  );
}
```

### 1.4 Proof Badge

```typescript
type ProofState = "NONE" | "PENDING" | "VERIFIED";

export function ProofBadge({ state }: { state: ProofState }) {
  if (state === "NONE") {
    return (
      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500">
        Not notarised
      </span>
    );
  }
  if (state === "PENDING") {
    return (
      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
        Proof pending
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
      Verified on RedBelly
    </span>
  );
}
```

---

## 2. Run List Page Components

### 2.1 RunListPage

```typescript
export function RunListPage() {
  // data via trpc.ramp.listRuns.useQuery(...)
  return (
    <PageShell title="Ramp runs">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-100">Ramp runs</h1>
        <button className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950">
          Start new run
        </button>
      </div>

      <RunFilters />
      <RunList />
    </PageShell>
  );
}
```

### 2.2 RunFilters

Keep it light on mobile:

```typescript
export function RunFilters() {
  return (
    <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
      {/* Date pill */}
      <button className="rounded-full border border-slate-800 px-2 py-1 text-slate-300">
        Today
      </button>
      {/* Status chips */}
      <button className="rounded-full bg-slate-800 px-2 py-1 text-slate-100">All</button>
      <button className="rounded-full bg-slate-900 px-2 py-1 text-slate-400">Review</button>
      <button className="rounded-full bg-slate-900 px-2 py-1 text-slate-400">Confirmed</button>
      {/* Type toggle */}
      <button className="rounded-full bg-slate-900 px-2 py-1 text-slate-400">
        Incoming / Outgoing
      </button>
    </div>
  );
}
```

### 2.3 RunCard

```typescript
type RunCardProps = {
  run: {
    runId: string;
    runType: "INCOMING" | "OUTGOING";
    siteName: string;
    pic: string;
    status: RunStatus;
    startedAt: string;
    headCount: number;
    highLameness: number;
    highTick: number;
    hasNlisExport: boolean;
  };
  onClick: () => void;
};

export function RunCard({ run, onClick }: RunCardProps) {
  const typeColour =
    run.runType === "INCOMING" ? "text-emerald-400" : "text-sky-400";

  return (
    <button
      onClick={onClick}
      className="mb-2 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-left shadow-sm"
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className={typeColour}>
            {run.runType === "INCOMING" ? "Incoming" : "Outgoing"}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">{run.siteName}</span>
          <span className="text-[10px] text-slate-500">{run.pic}</span>
        </div>
        <StatusChip status={run.status} />
      </div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{run.headCount} head detected</span>
        <span>{run.startedAt}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <StatPill label="Lame" value={run.highLameness} />
          <StatPill label="Ticks" value={run.highTick} />
        </div>
        {run.hasNlisExport && (
          <span className="text-[10px] text-emerald-400">NLIS file ready</span>
        )}
      </div>
    </button>
  );
}
```

---

## 3. Run Setup & Capture

### 3.1 RunSetupForm

```typescript
export function RunSetupForm() {
  return (
    <form className="space-y-3">
      <SectionHeader title="New run" subtitle="Set site and basic details" />
      <div className="space-y-2 text-xs">
        <label className="block">
          <span className="mb-1 block text-slate-400">Site</span>
          <select className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100">
            {/* options */}
          </select>
        </label>

        <div className="flex gap-2">
          <div className="flex-1 text-[11px] text-slate-500">
            PIC: <span className="font-mono text-slate-300">NSW123456</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
          >
            Incoming
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-400"
          >
            Outgoing
          </button>
        </div>

        {/* Truck, lot, counterparty, notes as simple inputs */}
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950"
      >
        Start capture
      </button>
    </form>
  );
}
```

### 3.2 CaptureView

```typescript
export function RunCapturePage() {
  return (
    <PageShell title="Capture run">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>SITE-1 • PIC NSW123456</span>
          <StatPill label="Run" value="INCOMING" />
        </div>

        <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black">
          {/* camera video feed / placeholder */}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-slate-400">00:32 • 18 animals seen</div>
          <button className="h-12 w-12 rounded-full bg-red-500 shadow-lg" />
          <button className="text-[11px] text-slate-400">
            Stop &amp; upload
          </button>
        </div>

        {/* Upload progress if active */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-1/3 bg-emerald-500" />
        </div>
      </div>
    </PageShell>
  );
}
```

---

## 4. Run Review

### 4.1 RunReviewPage Skeleton

```typescript
export function RunReviewPage() {
  // fetch via trpc.ramp.getRun
  const run = {/* ... */};

  return (
    <PageShell title="Review run">
      <RunReviewHeader run={run} />
      <RunSummaryBar summary={run.summary} />
      <RunAnimalsList animals={run.animals} />
      <RunReviewFooter />
    </PageShell>
  );
}
```

### 4.2 RunReviewHeader

```typescript
function RunReviewHeader({ run }: { run: GetRunResponse }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400">
              {run.runType === "INCOMING" ? "Incoming" : "Outgoing"}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">{run.siteId}</span>
            <span className="font-mono text-[10px] text-slate-500">{run.pic}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {run.summary.totalDetected} detected • {run.summary.totalIncluded} included
          </p>
        </div>
        <StatusChip status={run.status} />
      </div>
    </div>
  );
}
```

### 4.3 RunSummaryBar

```typescript
function RunSummaryBar({ summary }: { summary: RunSummaryDto }) {
  return (
    <div className="mb-3 flex flex-wrap gap-1">
      <StatPill label="Included" value={summary.totalIncluded} />
      <StatPill
        label="Excluded"
        value={summary.totalDetected - summary.totalIncluded}
      />
      <StatPill label="High lameness" value={summary.highLameness} />
      <StatPill label="High tick" value={summary.highTick} />
    </div>
  );
}
```

### 4.4 RunAnimalCard

```typescript
type RunAnimalCardProps = {
  animal: RunAnimalDto;
  onExcludeToggle: (ref: string, excluded: boolean) => void;
  onEditNlis: (ref: string) => void;
};

function RunAnimalCard({ animal, onExcludeToggle, onEditNlis }: RunAnimalCardProps) {
  return (
    <div className="mb-2 flex gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-900">
        <img src={animal.thumbnailUrl} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-1 text-[11px]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-slate-200">
              {animal.animalId ?? `Temp ${animal.tempRef}`}
            </span>
            <button
              type="button"
              onClick={() => onEditNlis(animal.tempRef)}
              className="text-[10px] text-sky-400"
            >
              NLIS: {animal.nlisId ?? "Set NLIS ID"}
            </button>
          </div>
          <ProofBadge
            state={
              animal.proof?.verified
                ? "VERIFIED"
                : animal.proof
                ? "PENDING"
                : "NONE"
            }
          />
        </div>
        <div className="flex flex-wrap gap-1 text-[10px]">
          {animal.lamenessClass && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-amber-300">
              Lameness: {animal.lamenessClass}
            </span>
          )}
          {animal.conditionScore && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-slate-300">
              BCS: {animal.conditionScore}
            </span>
          )}
          {animal.tickIndex !== undefined && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-slate-300">
              Tick index: {animal.tickIndex}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-1 text-[10px] text-slate-400">
            <input
              type="checkbox"
              checked={animal.excluded}
              onChange={(e) => onExcludeToggle(animal.tempRef, e.target.checked)}
              className="h-3 w-3 rounded border-slate-700 bg-slate-900"
            />
            Exclude from run
          </label>
          <span className="text-[10px] text-slate-500">
            Model conf: {(animal.modelConfidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Run Detail & Animal History

At this point the patterns repeat; these screens can reuse `RunSummaryBar`, `ProofBadge`, `StatPill`, etc. The main difference is they're read-only and show charts (you can use Recharts with a dark theme).

---

## 6. Tailwind Class Patterns

### Color Palette

**Background:**
- `bg-slate-950` - Page background
- `bg-slate-900` - Card background
- `bg-slate-800` - Border, secondary elements

**Text:**
- `text-slate-50` - Primary text
- `text-slate-100` - Secondary text
- `text-slate-300` - Tertiary text
- `text-slate-400` - Muted text
- `text-slate-500` - Very muted text

**Accent Colors:**
- `text-emerald-400` / `bg-emerald-500` - Primary actions, incoming runs
- `text-sky-400` / `bg-sky-500` - Outgoing runs
- `text-amber-400` / `bg-amber-500` - Warnings, pending states
- `text-red-500` / `bg-red-500` - Record button, errors

### Typography

**Font Sizes:**
- `text-[10px]` - Very small labels
- `text-[11px]` - Small labels, secondary info
- `text-xs` (12px) - Default small text
- `text-sm` (14px) - Section headers
- `text-base` (16px) - Page titles

**Font Weights:**
- `font-medium` - Status chips
- `font-semibold` - Headers, buttons
- `font-mono` - PICs, IDs

### Spacing

**Gaps:**
- `gap-1` (4px) - Tight spacing
- `gap-2` (8px) - Default spacing
- `gap-3` (12px) - Section spacing

**Padding:**
- `px-2 py-1` - Chips, pills
- `px-3 py-2` - Buttons, cards
- `px-4 py-3` - Page padding

**Margins:**
- `mb-1` (4px) - Tight vertical spacing
- `mb-2` (8px) - Default vertical spacing
- `mb-3` (12px) - Section spacing

### Borders & Rounding

**Border Radius:**
- `rounded-lg` - Cards, inputs
- `rounded-xl` - Large cards
- `rounded-full` - Chips, pills, buttons

**Border Width:**
- `border` - Default border
- `border-slate-800` - Border color

### Layout

**Flexbox:**
- `flex items-center justify-between` - Header rows
- `flex flex-col gap-3` - Vertical stacks
- `flex flex-wrap gap-2` - Filter chips

**Grid:**
- Not used in mobile-first design
- Can add for desktop: `md:grid md:grid-cols-2`

---

## 7. Responsive Patterns

### Mobile-first (Default)

All styles above are mobile-first. No breakpoint prefixes needed.

### Tablet (md: 768px+)

```typescript
// Example: Two-column layout on tablet
<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
  {/* content */}
</div>
```

### Desktop (lg: 1024px+)

```typescript
// Example: Wider cards on desktop
<div className="w-full lg:max-w-2xl">
  {/* content */}
</div>
```

---

## 8. Action Checklist

### Phase 1: Foundation
- [ ] Create `shared/components/primitives/` directory
- [ ] Implement `PageShell`, `SectionHeader`
- [ ] Implement `StatusChip`, `StatPill`, `ProofBadge`
- [ ] Set up Tailwind config with custom colors

### Phase 2: Run List
- [ ] Implement `RunListPage`
- [ ] Implement `RunFilters`
- [ ] Implement `RunCard`
- [ ] Wire tRPC `listRuns` query

### Phase 3: Run Setup & Capture
- [ ] Implement `RunSetupForm`
- [ ] Implement `RunCapturePage`
- [ ] Wire tRPC `createRun`, `startCapture` mutations
- [ ] Add camera access (MediaDevices API)

### Phase 4: Run Review
- [ ] Implement `RunReviewPage`
- [ ] Implement `RunReviewHeader`, `RunSummaryBar`
- [ ] Implement `RunAnimalCard`
- [ ] Wire tRPC `getRun`, `excludeAnimal`, `setNlisId` mutations

### Phase 5: Supporting Screens
- [ ] Implement `RunDetailPage`
- [ ] Implement `AnimalHistoryPage`
- [ ] Add charts (Recharts)
- [ ] Wire tRPC `getHistory` query

### Phase 6: Polish
- [ ] Add loading states (skeletons)
- [ ] Add error handling (toasts)
- [ ] Add offline indicators
- [ ] Test on real device

---

## 9. Testing Checklist

### Mobile Testing
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test with gloves (if realistic for operators)
- [ ] Test at typical outdoor brightness

### Interaction Testing
- [ ] Tap targets are at least 44x44px
- [ ] Forms submit on Enter key
- [ ] Checkboxes are easy to toggle
- [ ] Scrolling is smooth

### Visual Testing
- [ ] Text is readable at arm's length
- [ ] Colors have sufficient contrast
- [ ] Status chips are distinguishable
- [ ] Loading states are clear

---

**End of Frontend Specification**
