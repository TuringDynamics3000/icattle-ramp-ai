import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  PageShell,
  StatusChip,
  StatPill,
  ProofBadge,
} from "@/components/primitives";
import type { RunAnimalDto, GetRunResponse } from "@shared/types";

export function RunReviewPage() {
  const params = useParams<{ runId: string }>();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: run, isLoading } = trpc.ramp.getRun.useQuery({
    runId: params.runId!,
  });

  const excludeAnimal = trpc.ramp.excludeAnimal.useMutation({
    onSuccess: () => {
      utils.ramp.getRun.invalidate({ runId: params.runId! });
    },
  });

  const confirmRun = trpc.ramp.confirmRun.useMutation({
    onSuccess: ({ run }) => {
      setLocation(`/runs/${run.runId}`);
    },
  });

  const [editingNlis, setEditingNlis] = useState<string | null>(null);

  if (isLoading) {
    return (
      <PageShell title="Review run">
        <div className="text-center text-sm text-slate-400">Loading...</div>
      </PageShell>
    );
  }

  if (!run) {
    return (
      <PageShell title="Review run">
        <div className="text-center text-sm text-slate-400">Run not found</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Review run">
      <RunReviewHeader run={run} />
      <RunSummaryBar summary={run.summary} />

      <div className="mb-16">
        {run.animals.map((animal) => (
          <RunAnimalCard
            key={animal.tempRef}
            animal={animal}
            onExcludeToggle={(ref, excluded) => {
              excludeAnimal.mutate({
                runId: run.runId,
                tempRef: ref,
                reason: excluded ? "Operator excluded" : undefined,
              });
            }}
            onEditNlis={(ref) => setEditingNlis(ref)}
          />
        ))}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setLocation("/runs")}
            className="text-xs text-slate-400"
          >
            Back to runs
          </button>
          <button
            onClick={() => confirmRun.mutate({ runId: run.runId })}
            disabled={confirmRun.isPending}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
          >
            {confirmRun.isPending ? "Confirming..." : "Confirm Run & Generate NLIS"}
          </button>
        </div>
      </div>

      {/* NLIS Edit Modal (simplified) */}
      {editingNlis && (
        <NlisEditModal
          tempRef={editingNlis}
          runId={run.runId}
          onClose={() => setEditingNlis(null)}
        />
      )}
    </PageShell>
  );
}

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
            <span className="font-mono text-[10px] text-slate-500">
              {run.pic}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {run.summary.totalDetected} detected • {run.summary.totalIncluded}{" "}
            included
          </p>
        </div>
        <StatusChip status={run.status} />
      </div>
    </div>
  );
}

function RunSummaryBar({ summary }: { summary: GetRunResponse["summary"] }) {
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

function RunAnimalCard({
  animal,
  onExcludeToggle,
  onEditNlis,
}: {
  animal: RunAnimalDto;
  onExcludeToggle: (ref: string, excluded: boolean) => void;
  onEditNlis: (ref: string) => void;
}) {
  return (
    <div className="mb-2 flex gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-900">
        <img
          src={animal.thumbnailUrl}
          className="h-full w-full object-cover"
          alt={`Animal ${animal.tempRef}`}
        />
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
              BCS: {animal.conditionScore.toFixed(1)}
            </span>
          )}
          {animal.tickIndex !== undefined && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-slate-300">
              Tick index: {animal.tickIndex.toFixed(2)}
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

function NlisEditModal({
  tempRef,
  runId,
  onClose,
}: {
  tempRef: string;
  runId: string;
  onClose: () => void;
}) {
  const [nlisId, setNlisId] = useState("");
  const utils = trpc.useUtils();

  const setNlisMutation = trpc.ramp.setNlisId.useMutation({
    onSuccess: () => {
      utils.ramp.getRun.invalidate({ runId });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-950 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">
          Set NLIS ID for {tempRef}
        </h3>
        <input
          type="text"
          value={nlisId}
          onChange={(e) => setNlisId(e.target.value)}
          placeholder="XYZ123456789"
          className="mb-3 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={() => setNlisMutation.mutate({ runId, tempRef, nlisId })}
            disabled={!nlisId || setNlisMutation.isPending}
            className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
          >
            {setNlisMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
