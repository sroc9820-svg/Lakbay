export function Logo({ className = '', mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {mark && (
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <title>Lakbay mark</title>
            <path
              d="M3 17.5c4-1.2 6.5-1.6 9-1.6s5 .4 9 1.6M6.5 14.2 12 4l5.5 10.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12.2" r="1.6" fill="currentColor" />
          </svg>
        </span>
      )}
      <span className="font-display text-lg font-extrabold tracking-tight text-ink">Lakbay</span>
    </span>
  );
}
