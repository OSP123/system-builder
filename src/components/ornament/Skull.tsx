export function Skull({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden style={{ filter: "url(#roughen)" }}>
      <path
        fill="currentColor"
        d="M12 2C7.1 2 4 5.4 4 9.8c0 2.6 1.1 4.5 2.6 5.6V18c0 .6.4 1 1 1h1.2v1.6c0 .4.3.7.7.7h.9c.4 0 .7-.3.7-.7V19h1.8v1.6c0 .4.3.7.7.7h.9c.4 0 .7-.3.7-.7V19h1.2c.6 0 1-.4 1-1v-2.6C18.9 14.3 20 12.4 20 9.8 20 5.4 16.9 2 12 2z"
      />
      <ellipse cx="8.9" cy="10.6" rx="2.3" ry="2.6" fill="var(--color-void)" />
      <ellipse cx="15.1" cy="10.6" rx="2.3" ry="2.6" fill="var(--color-void)" />
      <path d="M12 13.2l-1.2 2.3h2.4z" fill="var(--color-void)" />
    </svg>
  );
}

/** Hand-ruled divider with a skull at its centre. */
export function SkullDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`} aria-hidden>
      <span className="ink-rule flex-1" />
      <span className="text-blood-bright">✠</span>
      <Skull className="h-8 w-8 text-vellum/80" />
      <span className="text-blood-bright">✠</span>
      <span className="ink-rule flex-1" />
    </div>
  );
}
