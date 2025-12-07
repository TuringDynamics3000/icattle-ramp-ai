import React, { useState } from "react";
import { PageShell, SectionHeader } from "../components/primitives";
import { PicSearchDialog, PicRecord } from "../components/PicSearchDialog";

export const PicSearchDemo: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPic, setSelectedPic] = useState<PicRecord | null>(null);

  return (
    <PageShell>
      <SectionHeader
        title="PIC Registry Demo"
        subtitle="Search and select NT Property Identification Codes"
      />

      <div className="space-y-6">
        {/* Selected PIC Display */}
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
                  {selectedPic.isActive ? (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-600/50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      INACTIVE
                    </span>
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
                <span className="font-medium">Region:</span> {selectedPic.region}
              </div>
              <div className="text-sm text-slate-400">
                <span className="font-medium">LGA:</span> {selectedPic.lga}
              </div>
              <div className="text-sm text-slate-400">
                <span className="font-medium">Jurisdiction:</span>{" "}
                {selectedPic.jurisdiction}
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setDialogOpen(true)}
            className="rounded bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500"
          >
            {selectedPic ? "Change Property" : "Find My Property"}
          </button>

          {selectedPic && (
            <button
              onClick={() => setSelectedPic(null)}
              className="rounded border border-slate-600 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Info Panel */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6">
          <div className="mb-3 text-sm font-medium text-slate-300">
            About PIC Registry
          </div>
          <div className="space-y-2 text-sm text-slate-400">
            <p>
              The Property Identification Code (PIC) registry contains{" "}
              <span className="font-semibold text-slate-300">3,489 properties</span> across Northern Territory and NSW.
            </p>
            <p>
              Search by PIC code, property name, region, or Local Government Area (LGA) to find your property.
            </p>
            <p>
              Properties marked as <span className="text-emerald-400">ACTIVE</span> are currently registered.
              Properties with <span className="text-sky-400">BMP</span> have a Biosecurity Management Plan.
            </p>
          </div>
        </div>

        {/* Sample Searches */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6">
          <div className="mb-3 text-sm font-medium text-slate-300">
            Try These Searches
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              onClick={() => {
                setDialogOpen(true);
                // Note: Would need to pass initial query to dialog
              }}
              className="rounded border border-slate-600 px-3 py-2 text-left text-slate-300 hover:bg-slate-800"
            >
              <div className="font-mono text-xs text-emerald-400">TADG0708</div>
              <div className="text-xs text-slate-400">Tipperary Station</div>
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              className="rounded border border-slate-600 px-3 py-2 text-left text-slate-300 hover:bg-slate-800"
            >
              <div className="font-mono text-xs text-emerald-400">DARWIN</div>
              <div className="text-xs text-slate-400">Search by region</div>
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              className="rounded border border-slate-600 px-3 py-2 text-left text-slate-300 hover:bg-slate-800"
            >
              <div className="font-mono text-xs text-emerald-400">LITCHFIELD</div>
              <div className="text-xs text-slate-400">Search by LGA</div>
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              className="rounded border border-slate-600 px-3 py-2 text-left text-slate-300 hover:bg-slate-800"
            >
              <div className="font-mono text-xs text-emerald-400">ADELAIDE</div>
              <div className="text-xs text-slate-400">Search by name</div>
            </button>
          </div>
        </div>
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
