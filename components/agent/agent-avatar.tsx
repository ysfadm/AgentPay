import { cn } from "@/lib/utils";

const COLORS = [
  "bg-emerald-500/20 text-emerald-400",
  "bg-sky-500/20 text-sky-400",
  "bg-violet-500/20 text-violet-400",
  "bg-amber-500/20 text-amber-400",
  "bg-rose-500/20 text-rose-400",
];

export function AgentAvatar({ seed, name, className }: { seed: string; name: string; className?: string }) {
  const idx = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length;
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className={cn("flex size-10 items-center justify-center rounded-lg font-semibold", COLORS[idx], className)}>
      {initials}
    </div>
  );
}
