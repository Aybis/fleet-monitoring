import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeStyles = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-zinc-900/8 text-zinc-900 dark:bg-white/12 dark:text-zinc-100",
        standard: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
        express: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950",
        sameday: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
        warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        destructive: "bg-red-600/14 text-red-700 dark:text-red-300",
        outline: "border border-border text-muted-foreground bg-transparent",
        secondary: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props} />;
}
