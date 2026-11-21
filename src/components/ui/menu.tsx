import * as React from "react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const ActionMenu = MenuPrimitive.Root;
export const ActionMenuTrigger = MenuPrimitive.Trigger;

export function ActionMenuPanel({
  className,
  offset = 6,
  align = "end",
  children,
}: {
  className?: string;
  offset?: number;
  align?: "start" | "center" | "end";
  children: React.ReactNode;
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={offset}
        className={cn(
          "z-50 min-w-44 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl",
          className
        )}
      >
        {children}
      </MenuPrimitive.Content>
    </MenuPrimitive.Portal>
  );
}

export function ActionMenuOption({
  className,
  onSelect,
  children,
}: {
  className?: string;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  return (
    <MenuPrimitive.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition-colors hover:bg-muted focus:bg-muted",
        className
      )}
    >
      {children}
    </MenuPrimitive.Item>
  );
}

export function ActionMenuHeading({ children }: { children: React.ReactNode }) {
  return (
    <MenuPrimitive.Label className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </MenuPrimitive.Label>
  );
}

export function ActionMenuDivider() {
  return <MenuPrimitive.Separator className="my-1 h-px bg-border" />;
}
