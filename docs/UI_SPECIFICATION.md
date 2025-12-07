# iCattle Ramp AI - UI Specification

**Version:** 1.0  
**Date:** December 7, 2025  
**Status:** Ready for Implementation

---

## Overview

This document defines four core screens (plus a simple Run Detail/Report view) and breaks each into concrete React components:

1. **Run List / Home** – where operators and managers live day-to-day
2. **Run Setup & Capture** – start run, record video, see capture status
3. **Run Review** – per-animal grid where the operator accepts/edits
4. **Animal History** – simple traceability view for a single animal
5. **Run Report** – manager/auditor-facing summary with welfare stats

For each screen: layout, key interactions, and a component breakdown you can implement in React + Tailwind + shadcn.

---

## 1. Global UX Principles

### Mobile-first
Design everything assuming a phone at the ramp.

### No noise
Only fields that matter to the operator; advanced detail can be tucked behind accordions or "More" links.

### Always know where you are
Use a simple top header and clear run status chips (CAPTURING, REVIEW, etc.).

### Tight feedback loops
Every critical action (start run, confirm run, export NLIS) gives immediate visual confirmation.

---

## 2. Screen: Run List / Home

**Goal:** One place to see "What's happening and what needs my attention?"

### Layout (mobile-first mental wireframe)

#### Top bar
- Left: iCattle logo + "Ramp AI"
- Right: user avatar/menu

#### Primary actions row
- Button: "Start New Run"

#### Filters (collapsible on mobile)
- Date range pill
- Site selector (if multi-site)
- Status filter chips: All / Capturing / Review / Confirmed
- Type filter: Incoming / Outgoing

#### Run list
Each run as a card:
- Line 1: `INCOMING • SITE-1 (NSW123456)`
- Line 2: `"Truck TRK-7 • LOT 55 • 78 head detected"`
- Status chip: CAPTURING / REVIEW / CONFIRMED (colour-coded)
- Small text: `"Started 08 Dec, 3:15pm"`
- Hint icons: ⚠ if high welfare issues, 📄 if NLIS export ready
- Tap card → Run Review or Run Detail (depending on status)

### Component breakdown

```typescript
<RampLayout> // shared shell

<RunListPage>
  <RunListHeader /> // title + "Start New Run"
  <RunFilters />
  <RunList />
    <RunCard />
```

### Props examples

```typescript
type RunCardProps = {
  run: {
    runId: string;
    siteName: string;
    pic: string;
    runType: "INCOMING" | "OUTGOING";
    status: RunStatus;
    startedAt: string;
    headCount: number;
    welfareSummary: { highLameness: number; highTick: number };
    hasNlisExport: boolean;
  };
  onClick: () => void;
};
```

---

## 3. Screen: Run Setup & Capture

**Goal:** Make starting a run and recording video one smooth flow.

### Layout

#### Step 1: Run setup

Page title: "New Run"

Fields:
- Site (pre-filled if single site)
- PIC (read-only from site)
- Run Type: [ Incoming ] [ Outgoing ]
- Truck ID (optional)
- Lot Number (optional)
- Counterparty (optional)
- Notes (optional)

Button: "Start Capture"

#### On Start Capture → Capture View

Full-screen camera view (on mobile):
- Big, obvious Record button
- Top overlay:
  - Site & PIC
  - Run type + truck ID

While recording:
- Timer
- "Animals detected: X" (optional live counter, can be post-processed initially)

End recording:
- Button: "Stop & Upload"
- Show upload progress bar
- Once queued → show "Processing…" and route to Review screen when ready

### Component breakdown

```typescript
<RunSetupPage>
  <RunSetupForm />

<RunCapturePage>
  <CameraView />
  <CaptureControls />
  <UploadProgressBar /> // when uploading
```

---

## 4. Screen: Run Review (Core UX)

**Goal:** Let operator quickly sanity-check what the model saw and then confirm.

### Layout

#### Top section

Breadcrumb: `Runs > RUN-123`

Header:
- "Run RUN-123 – INCOMING"
- Subtext: "SITE-1 • PIC NSW123456 • 78 detected"
- Status chip: REVIEW

Summary strip:
- `75 included • 3 excluded • 4 high lameness • 6 high tick`
- Optional: "All critical events notarised ✅" (or partial, via ProofService)

#### Main area: Per-animal list (mobile)

Either:
- Card list (one animal per card), or
- Compact table on desktop

Per animal card:
- Left: thumbnail
- Right:
  - Line 1: `Animal #A-0001` (or `ANI-98765` if known)
  - Line 2: `NLIS: XYZ123456789` (editable pencil icon)
  - Scores:
    - Lameness: MODERATE (0.82) – coloured pill
    - Condition: 3.5
    - Ticks: HIGH
  - Flags / badges:
    - ⚠ Lame
    - ⚠ High tick
  - Controls:
    - [Exclude] toggle / button
    - "More" → shows media clip if operator wants to inspect

#### Bottom bar
- Left: "Discard changes" (or back)
- Right: Primary button: **Confirm Run & Generate NLIS**

### Component breakdown

```typescript
<RunReviewPage>
  <RunReviewHeader /> // title, status, run meta
  <RunSummaryBar />
  <RunAnimalsList />
    <RunAnimalCard />
      // Contains Exclude toggle + NLIS edit
  <RunReviewFooter /> // Confirm button
```

### Key interactions / props

```typescript
type RunAnimalCardProps = {
  animal: RunAnimalDto;
  onExcludeToggle: (tempRef: string, excluded: boolean) => void;
  onEditNlis: (tempRef: string, nlisId: string) => void;
};
```

### State flows
- Exclude → call `rampRouter.excludeAnimal`
- Edit NLIS → open modal/input, then `rampRouter.setNlisId`
- Confirm → `rampRouter.confirmRun`, then navigate to Run Detail/Report

---

## 5. Screen: Run Detail / Report

**Goal:** A cleaner, mostly read-only view of a completed run for managers/auditors.

### Layout

#### Header
- Run RUN-123 – CONFIRMED
- INCOMING • SITE-1 • PIC NSW123456
- "Completed 08 Dec, 5:40pm"
- Button: "Download NLIS File"
- Button: "Download Report (PDF)"

#### Sections

**Summary:**
- Total detected / included
- Welfare distribution charts (small bar chart or stacked bar)
- Simple text: "4 animals flagged with moderate or severe lameness."

**Welfare breakdown:**
Mini table:
```
Class      | Count
-----------|------
NONE       | 60
MILD       | 11
MODERATE   | 4
SEVERE     | 0
```

**Proof section (later):**
- "Critical events notarised on RedBelly"
- Count of movements/health events with verified proofs
- Link: "View on-chain proof for sample animal"

**Animals overview:**
- Compact table (no editing), same fields as Review but read-only

### Component breakdown

```typescript
<RunDetailPage>
  <RunDetailHeader />
  <RunSummaryPanel />
  <WelfareBreakdownChart />
  <ProofSummaryPanel />
  <RunAnimalsTable />
```

---

## 6. Screen: Animal History

**Goal:** For managers/auditors/lenders to quickly look at one animal's ramp history.

### Layout

#### Header
- Animal ANI-98765
- NLIS: XYZ123456789
- Current PIC (if known)

#### Timeline

Vertical list of events:

**Event 1:**
- `08 Dec 2025 – Ramp Run RUN-123 at SITE-1`
- Lameness: MODERATE (0.82)
- Condition: 3.5
- Ticks: HIGH
- Badge: **Verified on RedBelly ✅** (with link)

**Event 2:**
- `21 Nov 2025 – Ramp Run RUN-087 at SITE-3`
- Lameness: NONE
- Badge: **Verification pending ⏳** (if commitment exists but not verified yet)

Allow click-through back to Run Detail.

### Component breakdown

```typescript
<AnimalHistoryPage>
  <AnimalHeader />
  <AnimalTimeline />
    <AnimalTimelineEvent />
```

### Props example

```typescript
type AnimalTimelineEventProps = {
  event: AnimalHistoryEvent;
};
```

### Proof resolution

History API already enriches with proof object – component just needs to render state:
- 🟢 Green "Verified" when `proof.verified === true`
- 🟡 Amber "Pending" when commitment exists but not verified
- ⚪ Grey when no proof

---

## 7. Component Library (shadcn/ui)

### Recommended Components

**Layout:**
- `Card` - For run cards, animal cards
- `Separator` - Between sections
- `ScrollArea` - For long lists

**Forms:**
- `Input` - Text inputs
- `Select` - Dropdowns (site, run type)
- `Textarea` - Notes field
- `Button` - Primary actions
- `Label` - Form labels

**Data Display:**
- `Badge` - Status chips, flags
- `Table` - Animal lists (desktop)
- `Avatar` - User avatar
- `Progress` - Upload progress
- `Skeleton` - Loading states

**Feedback:**
- `Alert` - Error messages
- `Toast` - Success confirmations
- `Dialog` - Edit NLIS modal
- `AlertDialog` - Confirm run dialog

**Navigation:**
- `Breadcrumb` - Navigation path
- `Tabs` - Filter tabs
- `DropdownMenu` - User menu

---

## 8. Design Tokens

### Colors

**Status Colors:**
```css
--status-draft: hsl(210, 40%, 96%);
--status-capturing: hsl(200, 100%, 90%);
--status-processing: hsl(45, 100%, 90%);
--status-review: hsl(30, 100%, 90%);
--status-confirmed: hsl(120, 60%, 90%);
```

**Welfare Colors:**
```css
--welfare-none: hsl(120, 60%, 50%);
--welfare-mild: hsl(60, 90%, 50%);
--welfare-moderate: hsl(30, 90%, 50%);
--welfare-severe: hsl(0, 90%, 50%);
```

**Proof Colors:**
```css
--proof-verified: hsl(120, 60%, 50%);
--proof-pending: hsl(45, 90%, 50%);
--proof-none: hsl(0, 0%, 70%);
```

### Typography

```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
```

### Spacing

```css
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;
--spacing-2xl: 3rem;
```

---

## 9. Responsive Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet portrait
  lg: '1024px',  // Tablet landscape / small desktop
  xl: '1280px',  // Desktop
  '2xl': '1536px' // Large desktop
};
```

### Layout Strategy

**Mobile (< 768px):**
- Single column
- Card-based lists
- Full-width buttons
- Collapsible filters

**Tablet (768px - 1024px):**
- Two columns where appropriate
- Hybrid card/table views
- Side-by-side forms

**Desktop (> 1024px):**
- Multi-column layouts
- Table views for lists
- Sidebar navigation
- Inline forms

---

## 10. Action Checklist

### Phase 1: Foundation
- [ ] Create `RampLayout` shared shell
- [ ] Set up routing (wouter or react-router)
- [ ] Configure Tailwind with design tokens
- [ ] Install shadcn/ui components

### Phase 2: Core Screens
- [ ] Implement `RunListPage` with filters
- [ ] Implement `RunSetupPage` with form
- [ ] Implement `RunCapturePage` with camera
- [ ] Implement `RunReviewPage` with animal cards
- [ ] Implement `RunDetailPage` with summary

### Phase 3: Supporting Features
- [ ] Implement `AnimalHistoryPage`
- [ ] Add RedBelly proof badges
- [ ] Add NLIS export download
- [ ] Add PDF report generation

### Phase 4: Polish
- [ ] Add loading states (skeletons)
- [ ] Add error handling (alerts, toasts)
- [ ] Add offline indicators
- [ ] Add responsive layouts
- [ ] Add keyboard shortcuts
- [ ] Add accessibility (ARIA labels)

---

## 11. tRPC Hooks Usage

### Run List
```typescript
const { data: runs, isLoading } = trpc.ramp.listRuns.useQuery({
  status: selectedStatus,
  runType: selectedType,
  fromDate: dateRange.from,
  toDate: dateRange.to,
});
```

### Create Run
```typescript
const createRun = trpc.ramp.createRun.useMutation({
  onSuccess: (run) => {
    router.push(`/runs/${run.runId}/capture`);
  },
});
```

### Get Run
```typescript
const { data: run } = trpc.ramp.getRun.useQuery({
  runId: params.runId,
});
```

### Exclude Animal
```typescript
const excludeAnimal = trpc.ramp.excludeAnimal.useMutation({
  onSuccess: () => {
    utils.ramp.getRun.invalidate({ runId });
  },
});
```

### Confirm Run
```typescript
const confirmRun = trpc.ramp.confirmRun.useMutation({
  onSuccess: ({ run, nlisExportId }) => {
    router.push(`/runs/${run.runId}`);
  },
});
```

### Animal History
```typescript
const { data: history } = trpc.animals.getHistory.useQuery({
  animalId: params.animalId,
});
```

---

## 12. State Management

### Local State (useState)
- Form inputs
- UI toggles (filters, modals)
- Temporary selections

### Server State (tRPC)
- Run data
- Animal data
- NLIS exports
- Animal history

### URL State (useSearchParams)
- Filters (status, type, date)
- Pagination (page, limit)
- Sort order

### No Global State Needed
- tRPC handles caching and invalidation
- React Query (via tRPC) handles loading/error states

---

## 13. Error Handling

### Network Errors
```typescript
const { data, error, isError } = trpc.ramp.getRun.useQuery({ runId });

if (isError) {
  return <Alert variant="destructive">{error.message}</Alert>;
}
```

### Mutation Errors
```typescript
const createRun = trpc.ramp.createRun.useMutation({
  onError: (error) => {
    toast({
      title: "Failed to create run",
      description: error.message,
      variant: "destructive",
    });
  },
});
```

### Offline Handling
```typescript
const isOnline = useOnlineStatus();

if (!isOnline) {
  return <Alert>You're offline. Changes will sync when reconnected.</Alert>;
}
```

---

## 14. Performance Considerations

### Lazy Loading
```typescript
const RunCapturePage = lazy(() => import('./pages/RunCapturePage'));
const AnimalHistoryPage = lazy(() => import('./pages/AnimalHistoryPage'));
```

### Image Optimization
```typescript
<img
  src={animal.thumbnailUrl}
  loading="lazy"
  decoding="async"
  alt={`Animal ${animal.tempRef}`}
/>
```

### Pagination
```typescript
const { data: runs } = trpc.ramp.listRuns.useQuery({
  limit: 20,
  offset: page * 20,
});
```

### Debounced Search
```typescript
const debouncedSearch = useDebouncedValue(searchQuery, 300);
```

---

**End of UI Specification**
