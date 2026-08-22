import clsx from "clsx";

interface LogoProps {
  size?: number;
  className?: string;
  /** dark = amber bg + dark mark (for light contexts) */
  variant?: "amber" | "white" | "dark";
}

export function LogoMark({ size = 36, variant = "amber", className }: LogoProps) {
  const bg  = variant === "amber" ? "#f59e0b" : variant === "white" ? "#ffffff" : "#020617";
  const ink = variant === "amber" ? "#0c0a09" : variant === "white" ? "#0c0a09" : "#f59e0b";
  const r   = size / 40;
  const s   = (n: number) => n * r;

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="مسار"
      role="img"
      className={className}
    >
      <rect width="40" height="40" rx={s(9)} fill={bg} />
      <polyline
        points={`${s(9)},${s(28)} ${s(20)},${s(13)} ${s(31)},${s(28)}`}
        stroke={ink}
        strokeWidth={s(3.5)}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={s(9)}  cy={s(28)} r={s(3.5)} fill={ink} />
      <circle cx={s(20)} cy={s(13)} r={s(3.5)} fill={ink} />
      <circle cx={s(31)} cy={s(28)} r={s(3.5)} fill={ink} />
    </svg>
  );
}

export function LogoWordmark({
  size = 36,
  className,
  dark = false,
}: {
  size?: number;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <LogoMark size={size} variant="amber" />
      <div>
        <div
          className={clsx(
            "font-semibold leading-tight tracking-tight",
            dark ? "text-slate-900" : "text-white"
          )}
          style={{ fontSize: size * 0.42 }}
          dir="rtl"
          lang="ar"
        >
          مسار
        </div>
        <div
          className={clsx("leading-tight", dark ? "text-slate-500" : "text-slate-500")}
          style={{ fontSize: size * 0.28 }}
        >
          Masaar
        </div>
      </div>
    </div>
  );
}
