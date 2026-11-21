import { CheckCircle2, AlertTriangle, Info, X, Undo2 } from "lucide-react";
import type { ToastItem } from "@/types/haultrack";
import { cn } from "@/lib/utils";

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2.5"
    >
      {toasts.map((t) => {
        const Icon =
          t.variant === "success"
            ? CheckCircle2
            : t.variant === "warning" || t.variant === "destructive"
            ? AlertTriangle
            : Info;

        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-2xl border bg-card/95 p-3.5 shadow-xl backdrop-blur-md transition-all",
              t.variant === "success" && "border-red-500/35",
              t.variant === "warning" && "border-amber-500/40",
              t.variant === "destructive" && "border-red-500/40",
              (!t.variant || t.variant === "default") && "border-border"
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                t.variant === "success" && "text-red-600 dark:text-red-400",
                t.variant === "warning" && "text-amber-500",
                t.variant === "destructive" && "text-red-500",
                (!t.variant || t.variant === "default") && "text-sky-600"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {t.description}
                </p>
              )}
              {t.undoAction && (
                <button
                  type="button"
                  onClick={() => {
                    t.undoAction?.();
                    onDismiss(t.id);
                  }}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-red-500/12 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-500/20 dark:text-red-300"
                >
                  <Undo2 className="h-3 w-3" />
                  Undo
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="cursor-pointer rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
