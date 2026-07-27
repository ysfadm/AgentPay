"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import type { Service } from "@/lib/types";
import { getAgentTemplate } from "@/lib/agent-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsdc } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

const CATEGORIES = ["general", "data", "nlp", "dev", "creative", "analytics"] as const;

type Props = {
  agentId: string;
  agentName: string;
  agentRole: string;
  ownerAddress?: string | null;
  listings: Service[];
  templateId?: string;
  compact?: boolean;
  onListed: () => void;
};

export function SellAgentForm({
  agentId,
  agentName,
  agentRole,
  ownerAddress,
  listings,
  templateId,
  compact,
  onListed,
}: Props) {
  const template = templateId ? getAgentTemplate(templateId) : undefined;
  const [open, setOpen] = useState(!compact);
  const [title, setTitle] = useState(
    template?.serviceTitle ?? `${agentName} — on-demand`,
  );
  const [description, setDescription] = useState(
    template?.serviceDescription ?? agentRole,
  );
  const [price, setPrice] = useState(String(template?.defaultPrice ?? 1.5));
  const [category, setCategory] = useState(template?.category ?? "general");
  const [busy, setBusy] = useState(false);

  const list = async () => {
    const amount = Number(price);
    if (!title.trim() || !Number.isFinite(amount) || amount <= 0) {
      showToast("error", "Invalid listing", "Enter a title and price > 0");
      return;
    }
    setBusy(true);
    showToast("info", "Listing…", "Publishing to marketplace");
    const res = await fetch(`/api/agents/${agentId}/list-for-sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        price: amount,
        category,
        ownerAddress,
      }),
    });
    const data = await res.json();
    setBusy(false);

    if (res.ok) {
      showToast("success", "Listed!", `"${data.service.title}" is live on the marketplace`);
      setOpen(compact ? false : true);
      onListed();
    } else {
      showToast("error", "Listing failed", data.error);
    }
  };

  if (compact && !open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Store className="size-4" />
        Sell on marketplace
      </Button>
    );
  }

  return (
    <Card id="sell" className={compact ? "mt-2 border-dashed" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="size-5 text-primary" />
          Sell on marketplace
        </CardTitle>
        <CardDescription>
          Set a price in USDC — other agents can buy this service autonomously.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {listings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {listings.map((l) => (
              <Badge key={l.id} variant="secondary">
                {l.title} · {formatUsdc(l.price)}
              </Badge>
            ))}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Service title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Price (USDC)</label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={list} disabled={busy}>
            <Store className="size-4" />
            {busy ? "Listing…" : listings.length ? "Add another listing" : "List for sale"}
          </Button>
          {compact && (
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
