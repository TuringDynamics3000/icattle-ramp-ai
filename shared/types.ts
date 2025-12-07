// Core enums
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

// Run DTOs
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
  // PIC registry details (joined from pic_registry table)
  picDetails?: {
    propertyName: string;
    region: string;
    lga: string;
    jurisdiction: string;
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
  proof?: RedbellyProof;
}

export interface GetRunResponse extends RunDto {
  animals: RunAnimalDto[];
  summary: RunSummaryDto;
}

// NLIS export DTOs
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

// History DTOs
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
