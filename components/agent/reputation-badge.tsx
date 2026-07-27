import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ReputationBadge({ score }: { score: number }) {
  const variant = score >= 90 ? "default" : score >= 70 ? "accent" : "muted";
  return (
    <Badge variant={variant} className="gap-1">
      <Star className="size-3 fill-current" />
      {score || "new"}
    </Badge>
  );
}
