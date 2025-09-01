import { cn } from "@/lib/utils"

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn("h-2 w-full rounded bg-muted", className)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      role="progressbar"
    >
      <div className="h-2 rounded bg-primary" style={{ width: `${clamped}%` }} />
    </div>
  )
}
