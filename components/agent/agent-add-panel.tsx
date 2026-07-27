"use client";

import { useState } from "react";
import { Plus, Sparkles, X, Link2, Download, RefreshCw } from "lucide-react";
import { AGENT_TEMPLATES } from "@/lib/agent-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

type Tab = "create" | "openclaw";

type OpenClawRow = {
  id: string;
  name: string;
  role: string;
  skills: string[];
  imported: boolean;
};

type Props = {
  tab: Tab;
  ownerAddress?: string | null;
  onClose: () => void;
  onTabChange: (tab: Tab) => void;
  onDone: () => void;
  openClawRows: OpenClawRow[];
  openClawLoading: boolean;
  onRefreshOpenClaw: () => void;
};

export function AgentAddPanel({
  tab,
  ownerAddress,
  onClose,
  onTabChange,
  onDone,
  openClawRows,
  openClawLoading,
  onRefreshOpenClaw,
}: Props) {
  const [customName, setCustomName] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  const create = async (opts: { templateId?: string; name?: string }) => {
    const key = opts.templateId ?? "custom";
    setCreating(key);
    showToast("info", "Creating agent...", "Generating Stellar wallet");
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...opts, ownerAddress }),
    });
    const data = await res.json();
    setCreating(null);
    if (res.ok) {
      showToast("success", "Agent ready!", data.agent.name);
      setCustomName("");
      onDone();
      onClose();
    } else {
      showToast("error", "Create failed", data.error);
    }
  };

  const importAgent = async (openclawId: string) => {
    setImporting(openclawId);
    showToast("info", "Syncing from OpenClaw…", "Linking agent to Stellar wallet");
    const res = await fetch("/api/agents/import/openclaw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openclawId, ownerAddress }),
    });
    const data = await res.json();
    setImporting(null);
    if (res.ok) {
      showToast("success", "Imported from OpenClaw", data.agent.name);
      onRefreshOpenClaw();
      onDone();
      onClose();
    } else if (res.status === 409) {
      showToast("info", "Already imported", data.agent?.name);
      onRefreshOpenClaw();
    } else {
      showToast("error", "Import failed", data.error);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Plus }[] = [
    { id: "create", label: "Create", icon: Sparkles },
    { id: "openclaw", label: "OpenClaw", icon: Link2 },
  ];

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>

      <div className="p-4">
        {tab === "create" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Pick a template — wallet and keypair are generated instantly.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {AGENT_TEMPLATES.map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  className="h-auto flex-col gap-1 py-3"
                  disabled={creating !== null}
                  onClick={() => create({ templateId: t.id })}
                >
                  <span className="text-lg">{t.emoji}</span>
                  <span className="text-xs font-medium">{t.name}</span>
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
              <Input
                placeholder="Custom name (optional)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") create({ name: customName.trim() || "My Agent" });
                }}
              />
              <Button
                onClick={() => create({ name: customName.trim() || "My Agent" })}
                disabled={creating !== null}
                className="shrink-0"
              >
                <Plus className="size-4" />
                {creating === "custom" ? "Creating…" : "Create custom"}
              </Button>
            </div>
          </div>
        )}

        {tab === "openclaw" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Import agents from your OpenClaw workspace.
              </p>
              <div className="flex items-center gap-2">
                <Badge>OpenClaw connected</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefreshOpenClaw}
                  disabled={openClawLoading}
                  title="Refresh"
                >
                  <RefreshCw className={cn("size-4", openClawLoading && "animate-spin")} />
                </Button>
              </div>
            </div>
            {openClawLoading ? (
              <p className="text-sm text-muted-foreground">Loading workspace…</p>
            ) : (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {openClawRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <AgentAvatar seed={row.id} name={row.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.role}</p>
                    </div>
                    {row.imported ? (
                      <Badge variant="secondary">Imported</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={importing !== null}
                        onClick={() => importAgent(row.id)}
                      >
                        <Download className="size-4" />
                        {importing === row.id ? "…" : "Import"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
