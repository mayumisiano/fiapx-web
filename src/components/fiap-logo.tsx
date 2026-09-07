export function FiapLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="text-2xl font-extrabold tracking-[0.18em] text-primary">
        FIAP
      </span>
      <span className="text-2xl font-light tracking-[0.18em] text-foreground">X</span>
    </span>
  );
}
