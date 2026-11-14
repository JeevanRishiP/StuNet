import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border dark:border-indigo-800/50",
        verified:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border dark:border-emerald-800/50",
        pending:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border dark:border-amber-800/50",
        destructive:
          "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 dark:border dark:border-rose-800/50",
        outline:
          "border border-slate-300 text-slate-700 bg-white dark:border-slate-700 dark:text-slate-300 dark:bg-slate-900",
        secondary:
          "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        campus:
          "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300 dark:border dark:border-violet-800/50",
        urgent: "border-transparent bg-red-600 text-white animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
