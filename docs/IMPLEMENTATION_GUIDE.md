# iCattle Ramp AI - Implementation Guide

**Version:** 1.0  
**Date:** December 7, 2025  
**Status:** Ready for Development

---

## Overview

This document provides a developer-ready build pack for iCattle Ramp AI V1:

1. TypeScript domain models and API contracts
2. tRPC-style router skeletons for the Ramp service
3. CV client interface for the inference service
4. Postgres projection schemas (icattle tenant)
5. Event → projection mapping
6. Action checklist

**If your team implements exactly this (and nothing extra) you'll have a coherent first cut that matches the spec we agreed.**

---

## 1. TypeScript Domain Models

Drop these into `shared/types.ts` or similar.

### Core Enums

```typescript
export type RunStatus =
  | "DRAFT"
  | "CAPTURING"
  | "PROCESSING"
  | "REVIEW"
  | "CONFIRMED";

export type RunType = "INCOMING" | "OUTGOING";

export type UploadStatus = "NOT_UPLOADED" | "UPLOADED" | "UNKNOWN";

export type NlisExportStatus = "READY" | "GENERATING" | "FAILED";

export type LamenessClass = "NONE" | "MILD" | "MODERATE" | "SEVERE";

export type ProofChain = "REDBELLY_TESTNET" | "REDBELLY_MAINNET";

export interface RedbellyProof {
  verified: boolean;
  commitmentId?: string;
  chain?: ProofChain;
  txHash?: string;
  explorerUrl?: string;
}
```

### Run DTOs

```typescript
export interface CreateRunRequest {
  siteId: string;
  runType: RunType;
  truckId?: string;
  lotNumber?: string;
  counterpartyName?: string;
  counterpartyCode?: string;
  notes?: string;
}

export interface RunDto {
  runId: string;
  siteId: string;
  runType: RunType;
  status: RunStatus;
  pic: string;
  createdAt: string; // ISO8601
  metadata: {
    truckId?: string;
    lotNumber?: string;
    counterpartyName?: string;
    counterpartyCode?: string;
    notes?: string;
  };
}

export interface RunSummaryDto {
  totalDetected: number;
  totalIncluded: number;
  highLameness: number;
  highTick: number;
}

export interface RunAnimalDto {
  tempRef: string;
  animalId?: string;
  nlisId?: string;
  thumbnailUrl: string;
  mediaHash: string;
  lamenessScore?: number;
  lamenessClass?: LamenessClass;
  conditionScore?: number;
  tickIndex?: number;
  flags: string[];
  modelConfidence: number;
  excluded: boolean;
  proof?: RedbellyProof; // optional, populated from ProofService
}

export interface GetRunResponse extends RunDto {
  animals: RunAnimalDto[];
  summary: RunSummaryDto;
}
```

### NLIS Export DTOs

```typescript
export interface NlisExportDto {
  exportId: string;
  runId: string;
  siteId: string;
  pic: string;
  status: NlisExportStatus;
  fileName?: string;
  fileUrl?: string;
  generatedAt?: string;
  uploadStatus: UploadStatus;
}
```

### History DTOs

```typescript
export interface AnimalHistoryEvent {
  eventType: "RAMP_RUN" | "MOVEMENT" | "HEALTH";
  runId?: string;
  siteId?: string;
  occurredAt: string;
  lamenessClass?: LamenessClass;
  conditionScore?: number;
  tickIndex?: number;
  proof?: RedbellyProof;
}

export interface GetAnimalHistoryResponse {
  animalId: string;
  nlisId?: string;
  events: AnimalHistoryEvent[];
}
```

---

## 2. tRPC Router Skeletons

Assume a structure with `server/routers/` exposing tRPC routers.

### 2.1 Ramp Router

`server/routers/ramp.ts`

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import type {
  CreateRunRequest,
  RunDto,
  GetRunResponse,
  NlisExportDto,
} from "../../shared/types";

export const rampRouter = router({
  createRun: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        runType: z.enum(["INCOMING", "OUTGOING"]),
        truckId: z.string().optional(),
        lotNumber: z.string().optional(),
        counterpartyName: z.string().optional(),
        counterpartyCode: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<RunDto> => {
      const run = await ctx.rampService.createRun(input, ctx.user);
      return run;
    }),

  startCapture: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .mutation(async ({ ctx, input }): Promise<RunDto> => {
      return ctx.rampService.startCapture(input.runId, ctx.user);
    }),

  getRun: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }): Promise<GetRunResponse> => {
      return ctx.rampService.getRun(input.runId, ctx.user);
    }),

  excludeAnimal: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        tempRef: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.rampService.excludeAnimal(
        input.runId,
        input.tempRef,
        input.reason,
        ctx.user
      );
      return { success: true };
    }),

  setNlisId: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        tempRef: z.string(),
        nlisId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const animal = await ctx.rampService.setNlisId(
        input.runId,
        input.tempRef,
        input.nlisId,
        ctx.user,
      );
      return { success: true, animal };
    }),

  mergeAnimals: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        primaryTempRef: z.string(),
        duplicateTempRef: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.rampService.mergeAnimals(
        input.runId,
        input.primaryTempRef,
        input.duplicateTempRef,
        ctx.user,
      );
      return { success: true };
    }),

  confirmRun: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { run, nlisExportId } = await ctx.rampService.confirmRun(
        input.runId,
        ctx.user,
      );
      return { run, nlisExportId };
    }),

  getNlisExport: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }): Promise<NlisExportDto> => {
      return ctx.rampService.getNlisExportForRun(input.runId, ctx.user);
    }),

  listRuns: protectedProcedure
    .input(
      z.object({
        siteId: z.string().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        status: z
          .enum(["DRAFT", "CAPTURING", "PROCESSING", "REVIEW", "CONFIRMED"])
          .optional(),
        runType: z.enum(["INCOMING", "OUTGOING"]).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.rampService.listRuns(input, ctx.user);
    }),
});
```

### 2.2 Animal History Router

`server/routers/animals.ts`

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const animalsRouter = router({
  getHistory: protectedProcedure
    .input(z.object({ animalId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.historyService.getAnimalHistory(input.animalId, ctx.user);
    }),
});
```

---

## 3. CV Client Interface

`server/services/cvClient.ts`

```typescript
export interface CvDetection {
  localRef: string;
  mediaHash: string;
  thumbnailUrl: string;

  animalId?: string;
  nlisId?: string;
  idConfidence: number;

  lamenessScore?: number;
  lamenessClass?: "NONE" | "MILD" | "MODERATE" | "SEVERE";
  conditionScore?: number;
  tickIndex?: number;

  flags: string[];
  modelConfidence: number;
}

export interface ProcessRampRunResponse {
  runId: string;
  detections: CvDetection[];
}

export interface CvClient {
  processRampRun(input: {
    runId: string;
    uploadId: string;
    siteId: string;
    pic: string;
    runType: "INCOMING" | "OUTGOING";
  }): Promise<ProcessRampRunResponse>;
}
```

**Ramp service uses this interface; actual implementation calls your CV microservice.**

### Stub Implementation (for MVP)

```typescript
export class StubCvClient implements CvClient {
  async processRampRun(input: {
    runId: string;
    uploadId: string;
    siteId: string;
    pic: string;
    runType: "INCOMING" | "OUTGOING";
  }): Promise<ProcessRampRunResponse> {
    // Generate 5-10 fake detections for testing
    const count = Math.floor(Math.random() * 6) + 5;
    const detections: CvDetection[] = [];

    for (let i = 0; i < count; i++) {
      detections.push({
        localRef: `A-${String(i + 1).padStart(4, "0")}`,
        mediaHash: `sha256:fake-${input.runId}-${i}`,
        thumbnailUrl: `https://placehold.co/400x300?text=Animal+${i + 1}`,
        animalId: Math.random() > 0.3 ? `ANI-${Math.floor(Math.random() * 100000)}` : undefined,
        nlisId: Math.random() > 0.5 ? `XYZ${Math.floor(Math.random() * 1000000000)}` : undefined,
        idConfidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
        lamenessScore: Math.random(),
        lamenessClass: ["NONE", "MILD", "MODERATE", "SEVERE"][Math.floor(Math.random() * 4)] as any,
        conditionScore: Math.random() * 4 + 1, // 1-5
        tickIndex: Math.random(),
        flags: Math.random() > 0.7 ? ["HIGH_LAMENESS"] : [],
        modelConfidence: Math.random() * 0.2 + 0.8, // 0.8-1.0
      });
    }

    return {
      runId: input.runId,
      detections,
    };
  }
}
```

---

## 4. Postgres Projections (Schemas)

These are read models sitting beside TuringCore's canonical event log. Name them under an `icattle` schema or prefix.

### 4.1 icattle_runs

```sql
CREATE TABLE icattle_runs (
    run_id           VARCHAR(64) PRIMARY KEY,
    tenant_id        VARCHAR(64) NOT NULL,
    site_id          VARCHAR(64) NOT NULL,
    pic              VARCHAR(32) NOT NULL,
    run_type         VARCHAR(16) NOT NULL, -- INCOMING/OUTGOING
    status           VARCHAR(16) NOT NULL,
    truck_id         VARCHAR(64),
    lot_number       VARCHAR(64),
    counterparty_name VARCHAR(128),
    counterparty_code VARCHAR(64),
    notes            TEXT,
    started_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at     TIMESTAMP WITH TIME ZONE,
    total_detected   INTEGER DEFAULT 0,
    total_included   INTEGER DEFAULT 0,
    high_lameness    INTEGER DEFAULT 0,
    high_tick        INTEGER DEFAULT 0,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_icattle_runs_site_date
ON icattle_runs (site_id, started_at DESC);
```

### 4.2 icattle_run_animals

```sql
CREATE TABLE icattle_run_animals (
    run_id          VARCHAR(64) NOT NULL,
    temp_ref        VARCHAR(64) NOT NULL,
    animal_id       VARCHAR(64),
    nlis_id         VARCHAR(32),
    thumbnail_url   TEXT,
    media_hash      VARCHAR(128) NOT NULL,
    lameness_score  NUMERIC,
    lameness_class  VARCHAR(16),
    condition_score NUMERIC,
    tick_index      NUMERIC,
    flags           TEXT[], -- array of strings
    model_confidence NUMERIC,
    excluded        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, temp_ref)
);

CREATE INDEX idx_icattle_run_animals_animal
ON icattle_run_animals (animal_id);
```

### 4.3 icattle_movements

```sql
CREATE TABLE icattle_movements (
    movement_id     VARCHAR(64) PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    animal_id       VARCHAR(64) NOT NULL,
    nlis_id         VARCHAR(32),
    run_id          VARCHAR(64),
    site_id         VARCHAR(64),
    from_pic        VARCHAR(32),
    to_pic          VARCHAR(32),
    movement_type   VARCHAR(16), -- INCOMING/OUTGOING
    occurred_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_icattle_movements_animal
ON icattle_movements (animal_id, occurred_at DESC);
```

### 4.4 icattle_health_events

```sql
CREATE TABLE icattle_health_events (
    health_event_id VARCHAR(64) PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    animal_id       VARCHAR(64) NOT NULL,
    run_id          VARCHAR(64),
    site_id         VARCHAR(64),
    pic             VARCHAR(32),
    lameness_score  NUMERIC,
    lameness_class  VARCHAR(16),
    condition_score NUMERIC,
    tick_index      NUMERIC,
    flags           TEXT[],
    model_confidence NUMERIC,
    observed_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_icattle_health_events_animal
ON icattle_health_events (animal_id, observed_at DESC);
```

### 4.5 icattle_nlis_exports

```sql
CREATE TABLE icattle_nlis_exports (
    export_id       VARCHAR(64) PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    run_id          VARCHAR(64) NOT NULL,
    site_id         VARCHAR(64) NOT NULL,
    pic             VARCHAR(32) NOT NULL,
    status          VARCHAR(16) NOT NULL, -- READY/GENERATING/FAILED
    file_name       VARCHAR(256),
    file_url        TEXT,
    generated_at    TIMESTAMP WITH TIME ZONE,
    upload_status   VARCHAR(16) NOT NULL DEFAULT 'NOT_UPLOADED',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_icattle_nlis_exports_run
ON icattle_nlis_exports (run_id);
```

**Note:** RedBelly commitments stay in the shared `redbelly_commitments` table; you'll query by `tenant_id='icattle'` + `entity_type='animal'` + `entity_id`.

---

## 5. Event → Projection Mapping

You can implement a simple projector consumer in TuringCore for the icattle tenant:

### On `ramp_run_started`
- Insert into `icattle_runs` with `status='CAPTURING'` (or DRAFT if you prefer create vs start split).

### On `animal_seen_at_ramp`
- Upsert into `icattle_run_animals` keyed by `(run_id, local_ref)`.

### On `cattle_movement_recorded`
- Insert into `icattle_movements`.
- Optionally update `icattle_runs.total_detected` and `total_included` (if not excluded).

### On `health_event_recorded`
- Insert into `icattle_health_events`.
- Recompute `icattle_runs.high_lameness`, `high_tick` via simple aggregate or maintain incrementally.

### On review events (exclude/merge/nlis-override)
- Update `icattle_run_animals.excluded` or `.nlis_id`.
- Recompute `icattle_runs.total_included`.

### On `ramp_run_completed`
- Update `icattle_runs.status='CONFIRMED'` and summary fields.

### On `nlis_export_generated`
- Insert or update `icattle_nlis_exports` record for that run.

### Proofs
Separate ProofService queries `redbelly_commitments` and enriches:
- `RunAnimalDto.proof` for current run.
- `AnimalHistoryEvent.proof` for history calls.

---

## 6. Action Checklist

### Phase 1: Foundation
- [ ] Create `shared/types.ts` with all TypeScript models above
- [ ] Implement `rampRouter` and `animalsRouter` in server using tRPC
- [ ] Stand up the CV client interface and stub implementation
- [ ] Apply projection schemas in TuringCore database
- [ ] Wire simple projector to TuringCore events

### Phase 2: Happy Path
- [ ] Create run → upload video → stub CV → events → projections
- [ ] NLIS export stub → run visible in UI
- [ ] Review UI with operator adjustments
- [ ] Confirm run workflow end-to-end

### Phase 3: Integration
- [ ] Plug in real CV service
- [ ] Wire RedBelly proof enrichment via ProofService
- [ ] Test critical events (movement, health) trigger Rule 12
- [ ] Verify commitments appear in `redbelly_commitments`

### Phase 4: Polish
- [ ] Add loading states and error handling
- [ ] Implement offline-tolerant chunked uploads
- [ ] Add RedBelly verification badges to UI
- [ ] Generate real NLIS export files
- [ ] Create run reports (PDF/HTML)

---

## 7. Development Workflow

### Local Development
```bash
# Start TuringCore API (if separate)
cd TuringCore-v3
python -m uvicorn main:app --reload

# Start Ramp AI dev server
cd icattle-ramp-ai
pnpm dev
```

### Testing
```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Test happy path manually
# 1. Create run
# 2. Upload video (stub)
# 3. Review detections
# 4. Confirm run
# 5. Download NLIS export
```

### Deployment
```bash
# Build for production
pnpm build

# Deploy to staging
pnpm deploy:staging

# Deploy to production
pnpm deploy:prod
```

---

## 8. Integration Points

### TuringCore API
- Base URL: `https://api.turingcore.com` (or local)
- Auth: Bearer token (Manus OAuth)
- Tenant: `icattle`

### CV Service
- Base URL: `https://cv.turingcore.com` (or local stub)
- Auth: Internal service token
- Endpoint: `POST /process-ramp-run`

### RedBelly Blockchain
- Network: Testnet (initially)
- Integration: Via TuringCore Protocol (Rule 12)
- Proofs: Query via ProofService

---

**End of Implementation Guide**
