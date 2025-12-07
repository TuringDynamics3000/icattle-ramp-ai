import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageShell, ProofBadge } from "@/components/primitives";

export function AnimalHistoryPage() {
  const params = useParams<{ animalId: string }>();
  const [, setLocation] = useLocation();

  const { data: history, isLoading } = trpc.animals.getHistory.useQuery({
    animalId: params.animalId!,
  });

  if (isLoading) {
    return (
      <PageShell title="Animal history">
        <div className="text-center text-sm text-slate-400">Loading...</div>
      </PageShell>
    );
  }

  if (!history) {
    return (
      <PageShell title="Animal history">
        <div className="text-center text-sm text-slate-400">
          Animal not found
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Animal history">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => setLocation("/runs")}
          className="mb-2 text-xs text-sky-400"
        >
          ← Back to runs
        </button>
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            {history.nlisId || history.animalId}
          </h2>
          <p className="text-xs text-slate-500">
            {history.events.length} events recorded
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {history.events.map((event, index) => (
          <div
            key={index}
            className="relative rounded-xl border border-slate-800 bg-slate-900/40 p-3"
          >
            {/* Event type badge */}
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  event.eventType === "RAMP_RUN"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : event.eventType === "MOVEMENT"
                    ? "bg-sky-500/10 text-sky-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {event.eventType.replace("_", " ")}
              </span>
              <ProofBadge
                state={
                  event.proof?.verified
                    ? "VERIFIED"
                    : event.proof
                    ? "PENDING"
                    : "NONE"
                }
              />
            </div>

            {/* Event details */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Date</span>
                <span className="text-slate-200">
                  {new Date(event.occurredAt).toLocaleString("en-AU")}
                </span>
              </div>
              {event.siteId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Site</span>
                  <span className="text-slate-200">{event.siteId}</span>
                </div>
              )}
              {event.runId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Run</span>
                  <button
                    onClick={() => setLocation(`/runs/${event.runId}`)}
                    className="text-sky-400"
                  >
                    {event.runId}
                  </button>
                </div>
              )}
            </div>

            {/* Welfare scores */}
            {(event.lamenessClass ||
              event.conditionScore ||
              event.tickIndex !== undefined) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {event.lamenessClass && (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-amber-300">
                    Lameness: {event.lamenessClass}
                  </span>
                )}
                {event.conditionScore && (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
                    BCS: {event.conditionScore.toFixed(1)}
                  </span>
                )}
                {event.tickIndex !== undefined && (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
                    Tick: {event.tickIndex.toFixed(2)}
                  </span>
                )}
              </div>
            )}

            {/* Proof details */}
            {event.proof?.verified && event.proof.explorerUrl && (
              <div className="mt-2 border-t border-slate-800 pt-2">
                <a
                  href={event.proof.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-sky-400"
                >
                  View on RedBelly Explorer →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
