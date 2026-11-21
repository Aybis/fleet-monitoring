import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import { TECHNICAL_GLOSSARY, type TechnicalTermKey } from "@/data/glossary";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

export function TermTooltip({
  termKey,
  children,
  showIcon = true,
  side = "top",
  className,
}: {
  termKey: TechnicalTermKey;
  children?: React.ReactNode;
  showIcon?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const entry = TECHNICAL_GLOSSARY[termKey];

  return (
    <TooltipPrimitive.Root delayDuration={120}>
      <TooltipPrimitive.Trigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "inline-flex cursor-help items-center gap-1 underline decoration-dotted decoration-muted-foreground/55 underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 rounded-xs",
            className
          )}
        >
          <span>{children ?? entry.term}</span>
          {showIcon && (
            <HelpCircle className="h-3 w-3 shrink-0 opacity-60 transition-opacity hover:opacity-100" />
          )}
        </span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="z-[9999] max-w-[290px] rounded-xl border border-slate-700/80 bg-slate-950/95 p-3 text-left text-slate-100 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold tracking-tight text-white">
              {entry.fullName}
            </span>
          </div>
          <span className="mt-1 inline-block rounded bg-red-600/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-300">
            {entry.category}
          </span>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
            {entry.explanation}
          </p>
          <TooltipPrimitive.Arrow className="fill-slate-950" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
