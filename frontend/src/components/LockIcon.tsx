/** The Pro lock (plan 100): closed for a Free player, open for an admin. */
export function LockIcon({ open = false, className = "hm-lock-icon" }: { open?: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d={open ? "M8 11V8a4 4 0 0 1 7.6-1.7" : "M8 11V8a4 4 0 0 1 8 0v3"} />
    </svg>
  );
}
