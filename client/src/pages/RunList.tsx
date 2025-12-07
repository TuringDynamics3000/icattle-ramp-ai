import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageShell, StatusChip, StatPill } from "@/components/primitives";
import type { RunDto, RunStatus, RunType } from "@shared/types";

export function RunListPage() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<RunStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<RunType | "ALL">("ALL");

  const { data, isLoading } = trpc.ramp.listRuns.useQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    runType: typeFilter === "ALL" ? undefined : typeFilter,
  });

  return (
    <PageShell title="Ramp runs">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-100">Ramp runs</h1>
        <button
          onClick={() => setLocation("/runs/create")}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
        >
          Start new run
        </button>
      </div>

      <RunFilters
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
      />

      {isLoading && (
        <div className="text-center text-sm text-slate-400">Loading runs...</div>
      )}

      {data && data.runs.length === 0 && (
        <div className="text-center text-sm text-slate-400">
          No runs found. Start a new run to get started.
        </div>
      )}

      {data && data.runs.length > 0 && (
        <div>
          {data.runs.map((run) => (
            <RunCard
              key={run.runId}
              run={run}
              onClick={() => {
                if (run.status === "REVIEW") {
                  setLocation(`/runs/${run.runId}/review`);
                } else {
                  setLocation(`/runs/${run.runId}`);
                }
              }}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function RunFilters({
  statusFilter,
  typeFilter,
  onStatusChange,
  onTypeChange,
}: {
  statusFilter: RunStatus | "ALL";
  typeFilter: RunType | "ALL";
  onStatusChange: (status: RunStatus | "ALL") => void;
  onTypeChange: (type: RunType | "ALL") => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
      {/* Status filters */}
      <button
        onClick={() => onStatusChange("ALL")}
        className={`rounded-full px-2 py-1 ${
          statusFilter === "ALL"
            ? "bg-slate-800 text-slate-100"
            : "bg-slate-900 text-slate-400"
        }`}
      >
        All
      </button>
      <button
        onClick={() => onStatusChange("REVIEW")}
        className={`rounded-full px-2 py-1 ${
          statusFilter === "REVIEW"
            ? "bg-slate-800 text-slate-100"
            : "bg-slate-900 text-slate-400"
        }`}
      >
        Review
      </button>
      <button
        onClick={() => onStatusChange("CONFIRMED")}
        className={`rounded-full px-2 py-1 ${
          statusFilter === "CONFIRMED"
            ? "bg-slate-800 text-slate-100"
            : "bg-slate-900 text-slate-400"
        }`}
      >
        Confirmed
      </button>

      {/* Type filter */}
      <button
        onClick={() =>
          onTypeChange(typeFilter === "ALL" ? "INCOMING" : "ALL")
        }
        className="rounded-full bg-slate-900 px-2 py-1 text-slate-400"
      >
        {typeFilter === "ALL" ? "All types" : typeFilter}
      </button>
    </div>
  );
}

function RunCard({ run, onClick }: { run: RunDto; onClick: () => void }) {
  const typeColour =
    run.runType === "INCOMING" ? "text-emerald-400" : "text-sky-400";

  // Format date
  const startedAt = new Date(run.createdAt).toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
          <span className="text-slate-300">{run.siteId}</span>
          <span className="text-[10px] text-slate-500">{run.pic}</span>
        </div>
        <StatusChip status={run.status} />
      </div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {run.metadata.truckId && `Truck ${run.metadata.truckId}`}
          {run.metadata.lotNumber && ` • LOT ${run.metadata.lotNumber}`}
        </span>
        <span>{startedAt}</span>
      </div>
      {run.metadata.counterpartyName && (
        <div className="text-[11px] text-slate-500">
          {run.metadata.counterpartyName}
        </div>
      )}
    </button>
  );
}
