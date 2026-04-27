import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        "flex h-12 w-full rounded-xl bg-[hsl(var(--input))] px-5 py-3 text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#0071BA]/30 focus:bg-white transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer appearance-none",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export { Select };
