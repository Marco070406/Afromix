import * as React from "react";
import { cn } from "@/app/(frontend)/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-semibold text-zinc-300">{label}</label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          style={{
            paddingLeft: leftIcon ? "44px" : "16px",
            paddingRight: rightIcon ? "44px" : "16px",
            ...props.style,
          }}
          className={cn(
            "w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-zinc-500",
            "focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50",
            "transition-all duration-200 shadow-inner",
            error && "border-red-500/50 focus:ring-red-500/50",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
