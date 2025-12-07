import type {
  RunDto,
  RunAnimalDto,
  GetRunResponse,
  RunSummaryDto,
  NlisExportDto,
  GetAnimalHistoryResponse,
  AnimalHistoryEvent,
  RunStatus,
  RunType,
  LamenessClass,
} from "../shared/types";

// Generate stub runs
export const stubRuns: RunDto[] = [
  {
    runId: "RUN-001",
    siteId: "SITE-1",
    runType: "INCOMING",
    status: "CONFIRMED",
    pic: "NSW123456",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      truckId: "TRK-7",
      lotNumber: "LOT-55",
      counterpartyName: "Smith Cattle Co",
      notes: "Good condition, no issues",
    },
  },
  {
    runId: "RUN-002",
    siteId: "SITE-1",
    runType: "OUTGOING",
    status: "REVIEW",
    pic: "NSW123456",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      truckId: "TRK-12",
      lotNumber: "LOT-88",
      counterpartyName: "Jones Feedlot",
    },
  },
  {
    runId: "RUN-003",
    siteId: "SITE-1",
    runType: "INCOMING",
    status: "PROCESSING",
    pic: "NSW123456",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    metadata: {
      truckId: "TRK-3",
    },
  },
];

// Generate stub animals for a run
export function generateStubAnimals(runId: string, count: number = 10): RunAnimalDto[] {
  const animals: RunAnimalDto[] = [];
  const lamenessClasses: LamenessClass[] = ["NONE", "MILD", "MODERATE", "SEVERE"];

  for (let i = 0; i < count; i++) {
    const lamenessClass = lamenessClasses[Math.floor(Math.random() * lamenessClasses.length)];
    const isHighLameness = lamenessClass === "MODERATE" || lamenessClass === "SEVERE";
    const isHighTick = Math.random() > 0.8;

    animals.push({
      tempRef: `A-${String(i + 1).padStart(4, "0")}`,
      animalId: Math.random() > 0.3 ? `ANI-${Math.floor(Math.random() * 100000)}` : undefined,
      nlisId: Math.random() > 0.5 ? `XYZ${Math.floor(Math.random() * 1000000000)}` : undefined,
      thumbnailUrl: `https://placehold.co/400x300/1e293b/94a3b8?text=Animal+${i + 1}`,
      mediaHash: `sha256:stub-${runId}-${i}`,
      lamenessScore: Math.random(),
      lamenessClass,
      conditionScore: Math.random() * 4 + 1, // 1-5
      tickIndex: Math.random(),
      flags: isHighLameness ? ["HIGH_LAMENESS"] : isHighTick ? ["HIGH_TICK"] : [],
      modelConfidence: Math.random() * 0.2 + 0.8, // 0.8-1.0
      excluded: false,
      proof: Math.random() > 0.5
        ? {
            verified: Math.random() > 0.3,
            commitmentId: `RBL_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            chain: "REDBELLY_TESTNET",
            txHash: `0x${Math.random().toString(36).substr(2, 16)}`,
            explorerUrl: `https://testnet-explorer.redbelly.network/tx/0x${Math.random().toString(36).substr(2, 16)}`,
          }
        : undefined,
    });
  }

  return animals;
}

// Get run with animals
export function getStubRun(runId: string): GetRunResponse | null {
  const run = stubRuns.find((r) => r.runId === runId);
  if (!run) return null;

  const animals = generateStubAnimals(runId, 12);
  const summary: RunSummaryDto = {
    totalDetected: animals.length,
    totalIncluded: animals.filter((a) => !a.excluded).length,
    highLameness: animals.filter((a) => 
      a.lamenessClass === "MODERATE" || a.lamenessClass === "SEVERE"
    ).length,
    highTick: animals.filter((a) => a.flags.includes("HIGH_TICK")).length,
  };

  return {
    ...run,
    animals,
    summary,
  };
}

// Get NLIS export for run
export function getStubNlisExport(runId: string): NlisExportDto | null {
  const run = stubRuns.find((r) => r.runId === runId);
  if (!run || run.status !== "CONFIRMED") return null;

  return {
    exportId: `EXP-${runId}`,
    runId,
    siteId: run.siteId,
    pic: run.pic,
    status: "READY",
    fileName: `nlis-${runId}.csv`,
    fileUrl: `/api/exports/${runId}.csv`,
    generatedAt: new Date().toISOString(),
    uploadStatus: "NOT_UPLOADED",
  };
}

// Get animal history
export function getStubAnimalHistory(animalId: string): GetAnimalHistoryResponse {
  const events: AnimalHistoryEvent[] = [
    {
      eventType: "RAMP_RUN",
      runId: "RUN-001",
      siteId: "SITE-1",
      occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lamenessClass: "MODERATE",
      conditionScore: 3.5,
      tickIndex: 0.8,
      proof: {
        verified: true,
        commitmentId: "RBL_1765086945_5bccf369",
        chain: "REDBELLY_TESTNET",
        txHash: "0x5bccf369abc123",
        explorerUrl: "https://testnet-explorer.redbelly.network/tx/0x5bccf369abc123",
      },
    },
    {
      eventType: "MOVEMENT",
      runId: "RUN-001",
      siteId: "SITE-1",
      occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      proof: {
        verified: true,
        commitmentId: "RBL_1765086945_abc12345",
        chain: "REDBELLY_TESTNET",
        txHash: "0xabc12345def678",
        explorerUrl: "https://testnet-explorer.redbelly.network/tx/0xabc12345def678",
      },
    },
    {
      eventType: "HEALTH",
      runId: "RUN-002",
      siteId: "SITE-1",
      occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      lamenessClass: "MILD",
      conditionScore: 4.0,
      tickIndex: 0.3,
      proof: {
        verified: false,
        commitmentId: "RBL_1765173345_pending",
        chain: "REDBELLY_TESTNET",
      },
    },
  ];

  return {
    animalId,
    nlisId: `XYZ${Math.floor(Math.random() * 1000000000)}`,
    events,
  };
}

// In-memory storage for mutations
const runStorage = new Map<string, GetRunResponse>(
  stubRuns.map((run) => [run.runId, getStubRun(run.runId)!])
);

export function updateAnimalExclusion(
  runId: string,
  tempRef: string,
  excluded: boolean
): void {
  const run = runStorage.get(runId);
  if (!run) throw new Error("Run not found");

  const animal = run.animals.find((a) => a.tempRef === tempRef);
  if (!animal) throw new Error("Animal not found");

  animal.excluded = excluded;

  // Update summary
  run.summary.totalIncluded = run.animals.filter((a) => !a.excluded).length;
}

export function updateAnimalNlisId(
  runId: string,
  tempRef: string,
  nlisId: string
): void {
  const run = runStorage.get(runId);
  if (!run) throw new Error("Run not found");

  const animal = run.animals.find((a) => a.tempRef === tempRef);
  if (!animal) throw new Error("Animal not found");

  animal.nlisId = nlisId;
}

export function confirmRun(runId: string): { run: RunDto; nlisExportId: string } {
  const run = runStorage.get(runId);
  if (!run) throw new Error("Run not found");

  run.status = "CONFIRMED";

  return {
    run,
    nlisExportId: `EXP-${runId}`,
  };
}
