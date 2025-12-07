# iCattle Ramp AI - API Contract

**Version:** 1.0  
**Date:** December 7, 2025

---

## Overview

This document defines the complete API contract for iCattle Ramp AI V1:

1. **Ramp Service API** - tRPC endpoints for the frontend app
2. **CV Service Contract** - Internal contract with computer vision microservice
3. **TuringCore Event Contracts** - Event payloads for Protocol integration

---

## 1. Ramp Service API

Think of this as the "Ramp Operator API" exposed via tRPC.

### 1.1 Create Run

**Endpoint:** `ramp.createRun`

Create a new run (incoming or outgoing) at a site.

```typescript
interface CreateRunRequest {
  siteId: string;          // iCattle site ID (linked to PIC)
  runType: "INCOMING" | "OUTGOING";
  truckId?: string;
  lotNumber?: string;
  counterpartyName?: string;   // buyer/seller name
  counterpartyCode?: string;   // optional customer/vendor code
  notes?: string;
}

interface RunDto {
  runId: string;
  siteId: string;
  runType: "INCOMING" | "OUTGOING";
  status: "DRAFT" | "CAPTURING" | "PROCESSING" | "REVIEW" | "CONFIRMED";
  pic: string;
  createdAt: string;       // ISO8601
  metadata: {
    truckId?: string;
    lotNumber?: string;
    counterpartyName?: string;
    counterpartyCode?: string;
    notes?: string;
  };
}
```

**Side-effect:** Emits `icattle.ramp_run_started`

---

### 1.2 Start Capture

**Endpoint:** `ramp.startCapture`

Explicit transition to CAPTURING state.

```typescript
interface StartCaptureRequest {
  runId: string;
}

interface StartCaptureResponse extends RunDto {
  status: "CAPTURING";
}
```

**Side-effect:** Updates Run status; may emit an update event.

---

### 1.3 Upload Video Chunks

**Endpoint:** `ramp.uploadChunk`

Supports chunked uploads for low connectivity.

```typescript
interface UploadChunkRequest {
  runId: string;
  uploadId: string;        // client-generated
  chunkIndex: number;
  chunkTotal: number;
  data: Buffer;            // binary video data
}

interface UploadChunkResponse {
  runId: string;
  uploadId: string;
  chunkIndex: number;
  chunkTotal: number;
  status: "IN_PROGRESS" | "COMPLETE";
}
```

**Side-effect:** Once last chunk uploaded, posts message to CV service: `ProcessRampRun(runId, uploadId)` and transitions Run to PROCESSING.

---

### 1.4 Get Run Details

**Endpoint:** `ramp.getRun`

Get run details for Review UI.

```typescript
interface GetRunRequest {
  runId: string;
}

interface RunAnimalDto {
  tempRef: string;          // local_ref from CV
  animalId?: string;        // iCattle animal_id if matched
  nlisId?: string;
  thumbnailUrl: string;
  mediaHash: string;
  lamenessScore?: number;   // 0-1 or 0-100
  lamenessClass?: "NONE" | "MILD" | "MODERATE" | "SEVERE";
  conditionScore?: number;  // 1-5 or 1-9
  tickIndex?: number;       // 0-1 or discrete
  flags: string[];          // e.g. ["HIGH_LAMENESS", "HIGH_TICK"]
  modelConfidence: number;  // 0-1
  excluded: boolean;        // user-marked false positive
}

interface GetRunResponse extends RunDto {
  animals: RunAnimalDto[];
  summary: {
    totalDetected: number;
    totalIncluded: number;
    highLameness: number;
    highTick: number;
  };
}
```

---

### 1.5 Operator Adjustments

#### Mark False Positive

**Endpoint:** `ramp.excludeAnimal`

```typescript
interface ExcludeAnimalRequest {
  runId: string;
  tempRef: string;
  reason?: string;
}

interface ExcludeAnimalResponse {
  success: boolean;
}
```

#### Assign / Override NLIS ID

**Endpoint:** `ramp.setNlisId`

```typescript
interface SetNlisIdRequest {
  runId: string;
  tempRef: string;
  nlisId: string;
}

interface SetNlisIdResponse {
  success: boolean;
  animal: RunAnimalDto;
}
```

#### Merge Two Detections

**Endpoint:** `ramp.mergeAnimals`

```typescript
interface MergeAnimalsRequest {
  runId: string;
  primaryTempRef: string;
  duplicateTempRef: string;
}

interface MergeAnimalsResponse {
  success: boolean;
}
```

**Side-effect:** Each adjustment emits `icattle.ramp_review_adjustment_recorded`

---

### 1.6 Confirm Run & Generate Outputs

**Endpoint:** `ramp.confirmRun`

```typescript
interface ConfirmRunRequest {
  runId: string;
  confirm: true;
}

interface ConfirmRunResponse {
  run: RunDto & { status: "CONFIRMED" };
  nlisExportId: string;
}
```

**Side-effects:**
- Emits `icattle.ramp_run_completed`
- Schedules/generates NLIS export
- Emits `icattle.nlis_export_generated`

#### Get NLIS Export

**Endpoint:** `ramp.getNlisExport`

```typescript
interface GetNlisExportRequest {
  runId: string;
}

interface NlisExportDto {
  exportId: string;
  runId: string;
  status: "READY" | "GENERATING" | "FAILED";
  fileName?: string;
  fileUrl?: string;
  generatedAt?: string;
  uploadStatus: "NOT_UPLOADED" | "UPLOADED" | "UNKNOWN";
}
```

#### Update NLIS Export Status

**Endpoint:** `ramp.updateNlisExport`

```typescript
interface UpdateNlisExportRequest {
  exportId: string;
  uploadStatus: "UPLOADED";
}

interface UpdateNlisExportResponse extends NlisExportDto {}
```

---

### 1.7 History Endpoints

#### List Runs

**Endpoint:** `ramp.listRuns`

Query by date, site, status, type.

```typescript
interface ListRunsQuery {
  siteId?: string;
  fromDate?: string;
  toDate?: string;
  status?: "DRAFT" | "CAPTURING" | "PROCESSING" | "REVIEW" | "CONFIRMED";
  runType?: "INCOMING" | "OUTGOING";
  limit?: number;
  offset?: number;
}

interface ListRunsResponse {
  runs: RunDto[];
  total: number;
}
```

#### Get Animal History

**Endpoint:** `icattle.getAnimalHistory`

```typescript
interface GetAnimalHistoryRequest {
  animalId: string;
}

interface AnimalHistoryEvent {
  eventType: "RAMP_RUN" | "MOVEMENT" | "HEALTH";
  runId?: string;
  siteId?: string;
  occurredAt: string;
  lamenessClass?: string;
  conditionScore?: number;
  tickIndex?: number;
  proof?: {
    verified: boolean;
    commitmentId?: string;
    chain?: "REDBELLY_TESTNET" | "REDBELLY_MAINNET";
    txHash?: string;
    explorerUrl?: string;
  };
}

interface GetAnimalHistoryResponse {
  animalId: string;
  nlisId?: string;
  events: AnimalHistoryEvent[];
}
```

---

## 2. CV Service Contract

Internal contract between ramp backend and CV microservice.

### Request

```typescript
interface ProcessRampRunRequest {
  runId: string;
  uploadId: string;
  siteId: string;
  pic: string;
  runType: "INCOMING" | "OUTGOING";
}
```

### Response

```typescript
interface CvDetection {
  localRef: string;
  mediaHash: string;       // hash of clip/frames
  thumbnailUrl: string;

  // Identification
  animalId?: string;       // iCattle digital ID if known
  nlisId?: string;         // decoded from tag if visible
  idConfidence: number;    // 0-1

  // Welfare scores
  lamenessScore?: number;
  lamenessClass?: "NONE" | "MILD" | "MODERATE" | "SEVERE";
  conditionScore?: number;
  tickIndex?: number;

  flags: string[];         // e.g. ["HIGH_LAMENESS","HIGH_TICK"]
  modelConfidence: number; // overall confidence
}

interface ProcessRampRunResponse {
  runId: string;
  detections: CvDetection[];
}
```

The ramp backend converts this directly into domain events.

---

## 3. TuringCore Event Contracts

These are the payloads that sit inside TuringCore's event envelopes.

### 3.1 icattle.ramp_run_started

```json
{
  "run_id": "RUN-123",
  "site_id": "SITE-01",
  "pic": "NSW123456",
  "run_type": "INCOMING",
  "metadata": {
    "truck_id": "TRK-7",
    "lot_number": "LOT-55",
    "counterparty_name": "ABC Livestock",
    "counterparty_code": "ABC123",
    "notes": "Night delivery"
  },
  "started_at": "2025-12-08T05:32:10Z"
}
```

### 3.2 icattle.animal_seen_at_ramp

```json
{
  "run_id": "RUN-123",
  "site_id": "SITE-01",
  "pic": "NSW123456",
  "local_ref": "A-0001",
  "animal_id": "ANI-98765",
  "nlis_id": "XYZ123456789",
  "media_hash": "sha256:...",
  "thumbnail_url": "https://.../thumbs/A-0001.jpg",
  "observed_at": "2025-12-08T05:33:15Z",
  "model_confidence": 0.96
}
```

### 3.3 icattle.cattle_movement_recorded ⚡ Critical (Rule 12)

```json
{
  "animal_id": "ANI-98765",
  "nlis_id": "XYZ123456789",
  "run_id": "RUN-123",
  "site_id": "SITE-01",
  "from_pic": "NSW000000",
  "to_pic": "NSW123456",
  "movement_type": "INCOMING",
  "occurred_at": "2025-12-08T05:33:20Z",
  "metadata": {
    "counterparty_name": "ABC Livestock",
    "truck_id": "TRK-7"
  }
}
```

**Rule 12 Enforcement:**

```python
await redbelly.notarise(
    data=payload,
    data_type="CATTLE_EVENT",
    entity_type="animal",
    entity_id=animal_id,
    tenant_id="icattle"
)
```

### 3.4 icattle.health_event_recorded ⚡ Critical (Rule 12)

```json
{
  "animal_id": "ANI-98765",
  "run_id": "RUN-123",
  "site_id": "SITE-01",
  "pic": "NSW123456",
  "lameness_score": 0.82,
  "lameness_class": "MODERATE",
  "condition_score": 3.5,
  "tick_index": 0.7,
  "flags": ["HIGH_LAMENESS", "HIGH_TICK"],
  "model_confidence": 0.93,
  "observed_at": "2025-12-08T05:33:22Z"
}
```

**Rule 12 Enforcement:**

Mapped to `CriticalOperationType.CATTLE_HEALTH_EVENT` → notarised.

### 3.5 icattle.ramp_run_completed

```json
{
  "run_id": "RUN-123",
  "site_id": "SITE-01",
  "pic": "NSW123456",
  "completed_at": "2025-12-08T05:40:00Z",
  "summary": {
    "total_detected": 78,
    "total_included": 75,
    "high_lameness": 4,
    "high_tick": 6
  }
}
```

### 3.6 icattle.nlis_export_generated

```json
{
  "export_id": "NLIS-EXP-001",
  "run_id": "RUN-123",
  "site_id": "SITE-01",
  "pic": "NSW123456",
  "file_name": "nlis-run-123-20251208.xml",
  "generated_at": "2025-12-08T05:41:10Z",
  "upload_status": "NOT_UPLOADED"
}
```

---

## Implementation Notes

### tRPC Router Structure

```typescript
export const appRouter = router({
  ramp: router({
    createRun: protectedProcedure.input(CreateRunRequest).mutation(...),
    startCapture: protectedProcedure.input(StartCaptureRequest).mutation(...),
    uploadChunk: protectedProcedure.input(UploadChunkRequest).mutation(...),
    getRun: protectedProcedure.input(GetRunRequest).query(...),
    excludeAnimal: protectedProcedure.input(ExcludeAnimalRequest).mutation(...),
    setNlisId: protectedProcedure.input(SetNlisIdRequest).mutation(...),
    mergeAnimals: protectedProcedure.input(MergeAnimalsRequest).mutation(...),
    confirmRun: protectedProcedure.input(ConfirmRunRequest).mutation(...),
    getNlisExport: protectedProcedure.input(GetNlisExportRequest).query(...),
    updateNlisExport: protectedProcedure.input(UpdateNlisExportRequest).mutation(...),
    listRuns: protectedProcedure.input(ListRunsQuery).query(...),
  }),
  
  icattle: router({
    getAnimalHistory: protectedProcedure.input(GetAnimalHistoryRequest).query(...),
  }),
});
```

### Event Emission Pattern

All domain changes should emit events via TuringCore EventIngest:

```typescript
await turingCore.emitEvent({
  tenant_id: "icattle",
  event_type: "icattle.cattle_movement_recorded",
  payload: {...},
  critical: true  // Triggers Rule 12 enforcement
});
```

### RedBelly Integration

Critical events automatically notarised via Rule 12 enforcement:

```typescript
// In TuringCore Protocol adapter
@enforce_rule12(
  operation_type=CriticalOperationType.CATTLE_MOVEMENT,
  data_extractor=lambda result: {...},
  entity_extractor=lambda result: ("animal", result.animal_id)
)
async def record_movement(...):
  # Business logic
  return movement
```

---

**End of API Contract**
