import { cn, explorerTxUrl } from "@/lib/utils";

type Props = {
  hash?: string | null;
  className?: string;
};

/** Consistent Stellar Expert link — always rendered; active when a tx hash exists. */
export function ExplorerTxLink({ hash, className }: Props) {
  const label = "View on Stellar Expert ↗";

  if (hash) {
    return (
      <a
        href={explorerTxUrl(hash)}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "shrink-0 text-xs font-medium text-accent hover:underline",
          className,
        )}
      >
        {label}
      </a>
    );
  }

  return (
    <span
      className={cn("shrink-0 text-xs text-muted-foreground/70", className)}
      title="No transaction hash for this entry (demo or pending)"
    >
      {label}
    </span>
  );
}
