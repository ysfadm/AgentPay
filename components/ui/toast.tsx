"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS: Record<
  ToastType,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-900 dark:text-emerald-100",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-900 dark:text-red-100",
    icon: "text-red-600 dark:text-red-400",
  },
  info: {
    bg: "bg-sky-50 dark:bg-sky-950",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-900 dark:text-sky-100",
    icon: "text-sky-600 dark:text-sky-400",
  },
};

let toastId = 0;
const listeners = new Set<(toast: Toast) => void>();

export function showToast(
  type: ToastType,
  title: string,
  description?: string,
  duration = 4000,
) {
  const id = String(toastId++);
  const toast: Toast = { id, type, title, description, duration };
  listeners.forEach((fn) => fn(toast));
  return id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    };

    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => {
        const colors = COLORS[toast.type];
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`rounded-lg border px-4 py-3 ${colors.bg} ${colors.border} ${colors.text} animate-in slide-in-from-right-full duration-300`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${colors.icon}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs mt-1 opacity-90">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="shrink-0 mt-0.5 hover:opacity-70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
