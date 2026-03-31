import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-[#007AFF] text-white rounded-full shadow-brand-glow hover:bg-[#0066d6] hover:shadow-none",
        destructive:
          "bg-red-500/10 text-red-600 rounded-full hover:bg-red-500 hover:text-white",
        outline:
          "bg-white text-primary rounded-full shadow-apple hover:bg-[#F5F5F7] border border-black/[0.08]",
        secondary:
          "bg-[#F5F5F7] text-primary rounded-full hover:bg-[#E8E8ED]",
        ghost:
          "text-secondary rounded-full hover:bg-[#F5F5F7] hover:text-primary",
        link:
          "text-interactive underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-12 px-6 text-base",
        sm:      "h-10 px-5 text-sm",
        lg:      "h-14 px-10 text-lg",
        icon:    "h-12 w-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
