import type { RunStatus } from "@shared/types";

// Page shell: full-height, mobile-first
export function PageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400">
            iCattle
          </span>
          <h1 className="text-base font-semibold">{title}</h1>
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-800" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-3">{children}</main>
    </div>
  );
}

// Section header
export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

// Status chip
export function StatusChip({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { label: string; classes: string }> = {
    DRAFT: { label: "Draft", classes: "bg-slate-800 text-slate-200" },
    CAPTURING: { label: "Capturing", classes: "bg-sky-500/10 text-sky-400" },
    PROCESSING: {
      label: "Processing",
      classes: "bg-amber-500/10 text-amber-400",
    },
    REVIEW: { label: "Review", classes: "bg-indigo-500/10 text-indigo-400" },
    CONFIRMED: {
      label: "Confirmed",
      classes: "bg-emerald-500/10 text-emerald-400",
    },
  };

  const { label, classes } = map[status];

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

// Stat pill
export function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-xs font-semibold text-slate-100">{value}</span>
    </div>
  );
}

// Proof badge
type ProofState = "NONE" | "PENDING" | "VERIFIED";

export function ProofBadge({ state }: { state: ProofState }) {
  if (state === "NONE") {
    return (
      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500">
        Not notarised
      </span>
    );
  }
  if (state === "PENDING") {
    return (
      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
        Proof pending
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
      Verified on RedBelly
    </span>
  );
}
