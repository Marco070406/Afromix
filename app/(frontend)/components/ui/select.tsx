import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/app/(frontend)/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, leftIcon, children, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-semibold text-zinc-300">{label}</label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none flex items-center justify-center z-10">
            {leftIcon}
          </div>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full h-11 rounded-xl appearance-none",
            "bg-[#14161f] border border-white/10 text-sm text-white",
            "pl-4 pr-10",
            leftIcon && "pl-10",
            "focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50",
            "transition-all duration-200 cursor-pointer shadow-inner",
            "[color-scheme:dark] [&>option]:bg-[#161822] [&>option]:text-white",
            error && "border-red-500/50 focus:ring-red-500/50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 flex items-center justify-center">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";
