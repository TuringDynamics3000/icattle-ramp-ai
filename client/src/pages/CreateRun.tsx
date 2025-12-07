import React, { useState } from "react";
import { useLocation } from "wouter";
import { PageShell, SectionHeader, StatusChip } from "../components/primitives";
import { PicSearchDialog, PicRecord } from "../components/PicSearchDialog";
import { trpc } from "../lib/trpc";

export const CreateRunPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"pic" | "details">("pic");
  
  // PIC selection
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPic, setSelectedPic] = useState<PicRecord | null>(null);

  // Run details
  const [runType, setRunType] = useState<"INCOMING" | "OUTGOING">("INCOMING");
  const [truckId, setTruckId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyCode, setCounterpartyCode] = useState("");
  const [notes, setNotes] = useState("");

  const createRunMutation = trpc.ramp.createRun.useMutation({
    onSuccess: (data) => {
      setLocation(`/runs/${data.runId}/review`);
    },
    onError: (error) => {
      alert(`Error creating run: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!selectedPic) {
      alert("Please select a property (PIC)");
      return;
    }

    createRunMutation.mutate({
      siteId: "SITE-1", // Default site for demo
      picCode: selectedPic.picCode,
      runType,
      truckId: truckId || undefined,
      lotNumber: lotNumber || undefined,
      counterpartyName: counterpartyName || undefined,
      counterpartyCode: counterpartyCode || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <PageShell>
      <SectionHeader
        title="Create New Run"
        subtitle="Select property and enter run details"
      />

      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step === "pic"
                  ? "bg-emerald-600 text-white"
                  : selectedPic
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              1
            </div>
            <span
              className={`text-sm ${
                step === "pic" ? "text-slate-200" : "text-slate-400"
              }`}
            >
              Select Property
            </span>
          </div>
          <div className="h-px flex-1 bg-slate-700" />
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step === "details"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              2
            </div>
            <span
              className={`text-sm ${
                step === "details" ? "text-slate-200" : "text-slate-400"
              }`}
            >
              Run Details
            </span>
          </div>
        </div>

        {/* Step 1: PIC Selection */}
        {step === "pic" && (
          <div className="space-y-4">
            {selectedPic ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                <div className="mb-2 text-sm font-medium text-slate-400">
                  Selected Property
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-semibold text-emerald-400">
                      {selectedPic.picCode}
                    </span>
                    <div className="flex gap-2">
                      {selectedPic.isActive && (
                        <StatusChip status="CONFIRMED" label="ACTIVE" />
                      )}
                      {selectedPic.hasBmp && (
                        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                          BMP
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-base text-slate-200">
                    {selectedPic.propertyName}
                  </div>
                  <div className="text-sm text-slate-400">
                    {selectedPic.region} · {selectedPic.lga}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-8 text-center">
                <div className="text-sm text-slate-400">
                  No property selected yet
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDialogOpen(true)}
                className="rounded bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500"
              >
                {selectedPic ? "Change Property" : "Find Property"}
              </button>

              {selectedPic && (
                <button
                  onClick={() => setStep("details")}
                  className="rounded bg-slate-700 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-600"
                >
                  Continue to Details →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Run Details */}
        {step === "details" && (
          <div className="space-y-6">
            {/* Selected PIC Summary */}
            {selectedPic && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Property</div>
                    <div className="font-mono text-sm text-emerald-400">
                      {selectedPic.picCode} · {selectedPic.propertyName}
                    </div>
                  </div>
                  <button
                    onClick={() => setStep("pic")}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Run Type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Run Type *
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setRunType("INCOMING")}
                  className={`flex-1 rounded border px-4 py-3 text-sm font-medium ${
                    runType === "INCOMING"
                      ? "border-emerald-600 bg-emerald-600/20 text-emerald-400"
                      : "border-slate-600 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Incoming
                </button>
                <button
                  onClick={() => setRunType("OUTGOING")}
                  className={`flex-1 rounded border px-4 py-3 text-sm font-medium ${
                    runType === "OUTGOING"
                      ? "border-sky-600 bg-sky-600/20 text-sky-400"
                      : "border-slate-600 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Outgoing
                </button>
              </div>
            </div>

            {/* Truck ID */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Truck ID
              </label>
              <input
                type="text"
                value={truckId}
                onChange={(e) => setTruckId(e.target.value)}
                placeholder="e.g., TRUCK-001"
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Lot Number */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Lot Number
              </label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g., LOT-2025-001"
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Counterparty */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Counterparty Name
                </label>
                <input
                  type="text"
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  placeholder="e.g., ABC Livestock"
                  className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Counterparty Code
                </label>
                <input
                  type="text"
                  value={counterpartyCode}
                  onChange={(e) => setCounterpartyCode(e.target.value)}
                  placeholder="e.g., ABC001"
                  className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this run..."
                rows={3}
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep("pic")}
                className="rounded border border-slate-600 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={createRunMutation.isLoading}
                className="flex-1 rounded bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {createRunMutation.isLoading ? "Creating..." : "Create Run"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PIC Search Dialog */}
      <PicSearchDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSelect={(pic) => setSelectedPic(pic)}
        jurisdiction="NT"
      />
    </PageShell>
  );
};
