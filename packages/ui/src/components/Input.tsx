import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
              icon && "pl-10",
              error &&
                "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-500 pl-1">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
            error && "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-rose-500 pl-1">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
