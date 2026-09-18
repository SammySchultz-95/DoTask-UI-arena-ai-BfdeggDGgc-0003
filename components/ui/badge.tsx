/**
 * Status badge. The API models statuses as free strings, so we map known
 * values to colors and fall back to neutral for anything else.
 */
const TONES: Record<string, string> = {
  // task / link lifecycles
  not_sent: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  scheduled: 'border-violet-400/40 bg-violet-400/10 text-violet-300',
  sent: 'border-neon-500/40 bg-neon-500/10 text-neon-300',
  responded: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  completed: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  // link statuses
  active: 'border-neon-500/40 bg-neon-500/10 text-neon-300',
  pending: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  unused: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  used: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  expired: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-400',
  revoked: 'border-red-400/40 bg-red-400/10 text-red-300',
  // client / admin statuses
  running: 'border-neon-500/40 bg-neon-500/10 text-neon-300',
  shutdown: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-400',
  suspended: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  online: 'border-neon-500/40 bg-neon-500/10 text-neon-300',
  offline: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-400',
  disabled: 'border-red-400/40 bg-red-400/10 text-red-300',
  inactive: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-400',
  failed: 'border-red-400/40 bg-red-400/10 text-red-300',
  error: 'border-red-400/40 bg-red-400/10 text-red-300',
  // log levels
  information: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  info: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  warning: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  warn: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  critical: 'border-red-400/40 bg-red-400/10 text-red-300',
  debug: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-400',
};

const FALLBACK = 'border-ink-400 bg-ink-700 text-fog-dim';

export function StatusBadge({ value }: { value?: string | null }) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-fog-faint">—</span>;
  }
  const tone = TONES[value.toLowerCase()] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] leading-4 ${tone}`}
    >
      {value}
    </span>
  );
}

export function NeutralBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ink-400 bg-ink-700 px-2 py-0.5 text-[11px] text-fog-dim">
      {children}
    </span>
  );
}
