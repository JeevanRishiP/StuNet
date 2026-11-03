import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-indigo-100 text-indigo-800",
        verified: "border-transparent bg-emerald-100 text-emerald-800",
        pending: "border-transparent bg-amber-100 text-amber-800",
        destructive: "border-transparent bg-rose-100 text-rose-800",
        outline: "border border-slate-300 text-slate-700 bg-white",
        secondary: "border-transparent bg-slate-100 text-slate-700",
        campus: "border-transparent bg-violet-100 text-violet-800",
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
