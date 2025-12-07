import React, { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";

export type PicRecord = {
  picCode: string;
  jurisdiction: string;
  propertyName: string;
  region: string;
  lga: string;
  isActive: boolean;
  hasBmp: boolean;
};

interface PicSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (pic: PicRecord) => void;
  jurisdiction?: string;
}

export const PicSearchDialog: React.FC<PicSearchDialogProps> = ({
  open,
  onClose,
  onSelect,
  jurisdiction = "NT",
}) => {
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  const { data, isLoading } = trpc.picRegistry.search.useQuery(
    { query, jurisdiction, limit: 20 },
    {
      enabled: open && query.length >= 2,
      keepPreviousData: true,
    }
  );

  // Debounce input
  const [inputValue, setInputValue] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(inputValue.trim()), 300);
    return () => clearTimeout(id);
  }, [inputValue]);

  if (!open) return null;

  const results = data || [];
  const filteredResults = activeOnly
    ? results.filter((p) => p.isActive)
    : results;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Select Property (PIC)
          </h2>
          <button
            onClick={onClose}
            className="rounded px-3 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Close
          </button>
        </div>

        {/* Search Controls */}
        <div className="border-b border-slate-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by PIC, property name, region or LGA…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              className="flex-1 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              Active only
            </label>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[500px] overflow-auto px-6 py-4">
          {isLoading && (
            <div className="py-8 text-center text-sm text-slate-400">
              Searching…
            </div>
          )}

          {!isLoading && query.length < 2 && (
            <div className="py-8 text-center text-sm text-slate-400">
              Type at least 2 characters to search
            </div>
          )}

          {!isLoading &&
            query.length >= 2 &&
            filteredResults.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No results for "{query}"
                {activeOnly && " (active only)"}
              </div>
            )}

          {!isLoading && filteredResults.length > 0 && (
            <div className="space-y-2">
              {filteredResults.map((pic) => (
                <div
                  key={pic.picCode}
                  className="flex items-center justify-between rounded border border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-emerald-400">
                        {pic.picCode}
                      </span>
                      <div className="flex gap-2">
                        {pic.isActive ? (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-600/50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                            INACTIVE
                          </span>
                        )}
                        {pic.hasBmp && (
                          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                            BMP
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-slate-200">
                      {pic.propertyName}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {pic.region} · {pic.lga}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onSelect(pic);
                      onClose();
                    }}
                    className="ml-4 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredResults.length > 0 && (
          <div className="border-t border-slate-700 px-6 py-3 text-xs text-slate-400">
            Showing {filteredResults.length} result
            {filteredResults.length !== 1 ? "s" : ""}
            {activeOnly && " (active only)"}
          </div>
        )}
      </div>
    </div>
  );
};
