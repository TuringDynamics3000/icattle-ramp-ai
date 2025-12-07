# iCattle Ramp AI - V1 Product Specification

**Version:** 1.0  
**Date:** December 7, 2025  
**Status:** Approved for Development

---

## Executive Summary

We'll define iCattle Ramp AI as a focused product whose only job is:

> "Capture every animal over a feedlot/saleyard ramp, auto-ID it, welfare-score it, and output NLIS-ready records + a yard report with no extra labour."

The spec below locks in:

- **Scope & personas** – one core persona (Ramp Operator), two secondary (Manager, Auditor/Bank).
- **End-to-end flows** – Start Run → Capture → Analyse → Review → Confirm → NLIS & Reports.
- **Functional requirements** – capture, CV pipeline, review UI, NLIS export, history/traceability, basic admin.
- **Data & event model** – how Runs, Animals, Movements, HealthEvents, and Media hang together inside TuringCore's icattle tenant.
- **TuringCore & RedBelly integration** – exactly which events go through Rule 12 and get notarised, and how proofs are exposed.
- **Non-functional & MVP cut** – performance, availability, offline behaviour, and a tight V1 vs "later" boundary.

If we build this spec and nothing else, you have a shippable, sellable product that owns the ramp and quietly builds the cryptographic cattle ledger you'll need for lenders and processors later.

---

## 1. Purpose & Scope

### 1.1 Product goal

Deliver a ramp-centric SaaS product for Australian feedlots and saleyards that:

- Works with smartphones and/or fixed cameras at the ramp.
- Automatically:
  - Detects each animal,
  - Links to an iCattle Digital ID (and NLIS tag where visible),
  - Scores lameness, body condition, and tick/parasite load,
  - Produces NLIS-ready movement records and a per-run welfare/compliance report.

### 1.2 In scope (V1)

- Single ramp workflow (incoming and outgoing runs).
- Capture via mobile app (phone camera). Fixed camera support optional but aligned.
- Automated per-animal detection, ID linking, and welfare scoring.
- Minimal operator review & correction.
- NLIS file export (manual upload flow) + simple CSV exports (for farm software).
- Basic run history and per-animal history in the UI.
- TuringCore integration:
  - All ramp events go into icattle tenant Golden Record.
  - Movement + Health events treated as critical and notarised via Rule 12 + RedBelly (testnet).

### 1.3 Explicitly out of scope (V1)

- Full paddock/grazing management, ration management, feed budgeting.
- Bank UX, loan origination, or collateral management.
- Deep integration with AgriWebb/Mobble etc. beyond CSV/JSON exports.
- Non-Australian regulatory regimes.

---

## 2. Personas & Use Cases

### 2.1 Ramp Operator (primary)

**Role:** Yard hand, saleyard operator, feedlot intake operator.

**Needs:**
- "Hit record, do my job, trust that the system has logged everything."
- Minimal extra taps while under time pressure.

**Success:**
- Uses Ramp AI on every run without slowing operations.

### 2.2 Operations Manager / Feedlot Manager

**Needs:**
- Daily/weekly view of runs, counts, and welfare issues.
- Evidence for NLIS compliance and welfare audits.

**Success:**
- Can answer "What went over the ramp yesterday?" and "Where are my lame/tick-heavy mobs?" in seconds.

### 2.3 Auditor / Bank / Processor (indirect, later)

**Needs:**
- Verifiable records for specific runs/lots: head count, movement, welfare.
- Cryptographic proof that data hasn't been tampered with.

**Success:**
- Can pull an iCattle Verified pack for a run/mob with on-chain reference.

---

## 3. Functional Requirements

### 3.1 Run Management

**FR-1 Create Run**

Operator can create a new Run with:
- `run_type` (incoming | outgoing),
- `site` (yard/saleyard, auto-links to PIC),
- Optional metadata: truck ID, lot number, buyer/seller, notes.

**FR-2 Capture Video**

Operator can:
- Use the phone camera to record video.
- For fixed cameras: select a camera feed (if configured for site).
- Video is uploaded in chunks to backend; low connectivity tolerant (queue/retry).

**FR-3 Run States**

Run lifecycle:
- `DRAFT` → `CAPTURING` → `PROCESSING` → `REVIEW` → `CONFIRMED`.
- Only DRAFT/CAPTURING runs can be cancelled without trace.

### 3.2 Computer Vision & Analysis

**FR-4 Animal Detection**

For each run, CV service outputs a list of detected animals with:
- Temporary `local_animal_ref`,
- Keyframes (thumbnail),
- `media_hash` (hash of underlying media clip).

**FR-5 ID & Tag Association**

CV attempts to:
- Link each detection to existing `animal_id` (iCattle ID embedding).
- Extract NLIS/tag number where visually available.
- Confidence scores included in output.

**FR-6 Welfare Scoring**

For each detected animal, model produces:
- `lameness_score` + severity class,
- `condition_score` (e.g. 1–5),
- `tick_burden_index` (0–1 or discrete bands).
- Configurable thresholds for "flag for review".

### 3.3 Event Emission (TuringCore)

**FR-7 Event Types (minimum V1)**

Upon analysis, iCattle app server issues events via TuringCore EventIngest:
- `icattle.ramp_run_started`
- `icattle.animal_seen_at_ramp`
- `icattle.cattle_movement_recorded`
- `icattle.health_event_recorded`
- `icattle.ramp_run_completed`
- `icattle.nlis_export_generated`

**FR-8 Critical Events for Rule 12 / RedBelly**

`icattle.cattle_movement_recorded` and `icattle.health_event_recorded` are `CriticalOperationType.CATTLE_MOVEMENT` / `CATTLE_HEALTH_EVENT`.

These MUST:
- Pass through Protocol enforcement decorator.
- Call `RedBellyIntegrationV2.notarise(..., data_type="CATTLE_EVENT", entity_type="animal", entity_id=animal_id, tenant_id="icattle")`.
- Commitments stored in `redbelly_commitments` and anchored (testnet initially).

### 3.4 Operator Review & Correction

**FR-9 Review Screen**

After processing, operator sees:
- Per-run table: thumbnail, ID/NLIS (if known), scores, flags, confidence.
- Must be usable on a phone in bright daylight.

**FR-10 Minimal Edits**

Operators can:
- Mark an entry as "false positive" (exclude from run).
- Merge two entries (same animal incorrectly split).
- Edit meta:
  - Assign/override NLIS ID,
  - Adjust lot or comments (not scores – those are model outputs).
- Changes are persisted via events (e.g. `icattle.ramp_review_adjustment_recorded`), not raw DB edits.

**FR-11 Confirm Run**

"Confirm run":
- Finalises run (no further edits).
- Emits `ramp_run_completed`.
- Triggers NLIS export generation job.

### 3.5 NLIS & Exports

**FR-12 NLIS Export**

System generates NLIS-compatible movement file for the run (format per current spec).

Operator can:
- Download file for manual upload to NLIS portal (V1),
- See an explicit "Uploaded/Not Uploaded" status (manual flag in V1).

**FR-13 Farm Software Export**

CSV export with:
- Date/time, run_id, animal_id, NLIS ID, PIC_from, PIC_to, welfare scores.
- Designed so AgriWebb/Mobble etc. can import with minimal mapping.

### 3.6 History & Reporting

**FR-14 Run History**

Filterable list of Runs by date, site, run_type, counterparty.

Status: Draft, In Progress, Processing, Review, Confirmed.

**FR-15 Per-Animal History**

Simple view:
- Last N ramp events per animal.
- Shows welfare scores and sites.
- Displays RedBelly "Verified" badge where a commitment + proof exists.

**FR-16 Run Report**

Auto-generated PDF/HTML:
- Head count and summary.
- Distribution of welfare scores.
- Highlighted anomalies (lameness, high tick burden).
- Footer: "Selected critical events notarised on RedBelly testnet" + link if available.

### 3.7 Admin & Configuration

**FR-17 Site Configuration**

Admin can configure:
- PIC(s),
- Default NLIS settings,
- Camera sources (if fixed cameras).

**FR-18 Users & Roles**

Roles:
- `RAMP_OPERATOR` – capture & confirm runs.
- `OPERATIONS_MANAGER` – view histories, reports, exports.
- `ADMIN` – manage sites, users.

Auth delegated to TuringCore's AuthService.

---

## 4. Data & Event Model (TuringCore – iCattle Tenant)

### 4.1 Core Entities

**Run**
- `run_id`, `site_id`, `pic`, `start_time`, `end_time`, `status`, `metadata`.

**Animal**
- `animal_id`, `nlis_id`, `biometric_fingerprint`, `current_pic`, `status`.

**RampEvent**
- `event_id`, `run_id`, `animal_id`, `media_hash`, raw model outputs.

**Movement**
- `movement_id`, `animal_id`, `from_pic`, `to_pic`, `run_id`, timestamps.

**HealthEvent**
- `health_event_id`, `animal_id`, scores, flags, `run_id`.

**NLISExport**
- `export_id`, `run_id`, file metadata, `upload_status`.

### 4.2 Projections & Proofs

**Projections:**
- `icattle_runs`
- `icattle_animals`
- `icattle_movements`
- `icattle_health_snapshots`

For critical events, join with:
- `redbelly_commitments` via `entity_type="animal"`, `entity_id=animal_id`, `data_type="CATTLE_EVENT"`.

---

## 5. Non-functional Requirements

### Performance
Target: processing 1–2 truckloads (e.g. 40–80 head) within 5–10 minutes of run end under normal connectivity.

### Availability
Aim 99.5%+ uptime for SaaS backend.

Offline-tolerant capture: app queues uploads when offline, warns operator.

### Usability
Mobile-first UI, large tap targets, minimal typing.

### Security
All calls via TLS.

Role-based access; tenant/org scopes via TuringCore.

### Auditability
All domain changes as events, not in-place updates.

Critical events hashed and committed; proofs queryable via ProofService.

---

## 6. MVP vs Later

### MVP (V1 – "Ramp AI Core")

Everything listed under FR-1 to FR-18, limited to:
- Phone capture only,
- NLIS file export (no direct API),
- RedBelly anchoring on testnet only.

### Later

- Fixed camera capture with calibration.
- Direct NLIS API integration.
- Lender/processor dashboards.
- Mainnet RedBelly anchoring with stricter Rule 12 policies (optionally fail-fast for specified events).
- Integration adapters for major farm platforms.

---

## Action Checklist

### Freeze spec
- ✅ Paste this into Confluence as "iCattle Ramp AI – V1 Product Spec".
- ✅ Add a one-page summary for non-technical stakeholders.

### Derive engineering tasks
Break into:
- Frontend (Run UI, Review UI, History).
- Backend app (ramp endpoints, exports).
- CV service contract.
- TuringCore wiring (events, Rule 12 mapping, RedBelly integration).

### Define a single happy-path demo
One run from capture → CV → events → NLIS file + run report, including at least one verified RedBelly commitment.

### Refuse scope creep
Any new idea gets evaluated against one question:

> "Does this directly improve the ramp capture → NLIS → report workflow?"

If not, it goes into "post-V1" backlog.

---

**End of Specification**
