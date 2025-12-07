import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  PageShell,
  StatusChip,
  StatPill,
  ProofBadge,
} from "@/components/primitives";

export function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const [, setLocation] = useLocation();

  const { data: run, isLoading } = trpc.ramp.getRun.useQuery({
    runId: params.runId!,
  });

  const { data: nlisExport } = trpc.ramp.getNlisExport.useQuery(
    { runId: params.runId! },
    { enabled: run?.status === "CONFIRMED" }
  );

  if (isLoading) {
    return (
      <PageShell title="Run detail">
        <div className="text-center text-sm text-slate-400">Loading...</div>
      </PageShell>
    );
  }

  if (!run) {
    return (
      <PageShell title="Run detail">
        <div className="text-center text-sm text-slate-400">Run not found</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Run detail">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => setLocation("/runs")}
          className="mb-2 text-xs text-sky-400"
        >
          ← Back to runs
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  run.runType === "INCOMING"
                    ? "text-emerald-400"
                    : "text-sky-400"
                }
              >
                {run.runType}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{run.siteId}</span>
            </div>
            {/* PIC Information */}
            {run.picDetails && (
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="font-mono text-emerald-400">{run.pic}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">{run.picDetails.propertyName}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{run.picDetails.region}, {run.picDetails.jurisdiction}</span>
              </div>
            )}
            {!run.picDetails && (
              <div className="mt-1 text-xs">
                <span className="font-mono text-slate-500">PIC: {run.pic}</span>
              </div>
            )}
            <p className="text-xs text-slate-500">
              {new Date(run.createdAt).toLocaleString("en-AU")}
            </p>
          </div>
          <StatusChip status={run.status} />
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <h3 className="mb-2 text-xs font-semibold text-slate-300">Summary</h3>
        <div className="flex flex-wrap gap-1">
          <StatPill label="Total detected" value={run.summary.totalDetected} />
          <StatPill label="Included" value={run.summary.totalIncluded} />
          <StatPill
            label="Excluded"
            value={run.summary.totalDetected - run.summary.totalIncluded}
          />
          <StatPill label="High lameness" value={run.summary.highLameness} />
          <StatPill label="High tick" value={run.summary.highTick} />
        </div>
      </div>

      {/* Metadata */}
      {run.metadata && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <h3 className="mb-2 text-xs font-semibold text-slate-300">
            Details
          </h3>
          <div className="space-y-1 text-xs">
            {run.metadata.truckId && (
              <div className="flex justify-between">
                <span className="text-slate-400">Truck</span>
                <span className="text-slate-200">{run.metadata.truckId}</span>
              </div>
            )}
            {run.metadata.lotNumber && (
              <div className="flex justify-between">
                <span className="text-slate-400">Lot</span>
                <span className="text-slate-200">{run.metadata.lotNumber}</span>
              </div>
            )}
            {run.metadata.counterpartyName && (
              <div className="flex justify-between">
                <span className="text-slate-400">Counterparty</span>
                <span className="text-slate-200">
                  {run.metadata.counterpartyName}
                </span>
              </div>
            )}
            {run.metadata.notes && (
              <div className="mt-2">
                <span className="text-slate-400">Notes</span>
                <p className="mt-1 text-slate-200">{run.metadata.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NLIS Export */}
      {nlisExport && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <h3 className="mb-2 text-xs font-semibold text-slate-300">
            NLIS Export
          </h3>
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <p className="text-slate-200">{nlisExport.fileName}</p>
              <p className="text-slate-500">
                Generated{" "}
                {nlisExport.generatedAt &&
                  new Date(nlisExport.generatedAt).toLocaleString("en-AU")}
              </p>
            </div>
            <a
              href={nlisExport.fileUrl}
              download
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
            >
              Download
            </a>
          </div>
        </div>
      )}

      {/* Animals */}
      <div className="mb-4">
        <h3 className="mb-2 text-xs font-semibold text-slate-300">
          Animals ({run.animals.filter((a) => !a.excluded).length} included)
        </h3>
        <div className="space-y-2">
          {run.animals
            .filter((a) => !a.excluded)
            .map((animal) => (
              <div
                key={animal.tempRef}
                className="flex gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2"
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-900">
                  <img
                    src={animal.thumbnailUrl}
                    className="h-full w-full object-cover"
                    alt={`Animal ${animal.tempRef}`}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200">
                      {animal.nlisId || animal.animalId || animal.tempRef}
                    </span>
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
                        {animal.lamenessClass}
                      </span>
                    )}
                    {animal.conditionScore && (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-slate-300">
                        BCS: {animal.conditionScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </PageShell>
  );
}
