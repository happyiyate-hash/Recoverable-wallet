import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * INSTITUTIONAL BUTTON SYSTEM
 * Version: 8.1.1 (Build Stability Patch)
 * 
 * Rules:
 * 1. HIGH FOREGROUND: Ensures text and icons pop against dark surfaces.
 * 2. SHARP BORDERS: Uses stronger opacity for outline/secondary nodes.
 * 3. TACTILE DEPTH: Increased shadow intensity for primary actions.
 */

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-black uppercase tracking-widest",
    "transition-all duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:scale-[0.95]",
    "select-none"
  ].join(" "),
  {
    variants: {
      variant: {
        /**
         * Primary Node: High-luminance brand color with heavy projection.
         */
        default: [
          "bg-primary",
          "text-black",
          "hover:brightness-125",
          "shadow-[0_10px_35px_rgba(var(--primary),0.45)]",
          "active:translate-y-0.5"
        ].join(" "),

        /**
         * Institutional Secondary: Lifted matte surface with near-white text.
         */
        secondary: [
          "bg-white/[0.12]",
          "text-white",
          "border border-white/25",
          "hover:bg-white/[0.18]",
          "hover:border-white/40",
          "shadow-2xl"
        ].join(" "),

        /**
         * Outline Premium: Brighter primary border.
         */
        outline: [
          "bg-transparent",
          "text-white",
          "border-2 border-white/20",
          "hover:bg-white/5",
          "hover:border-white/40",
          "shadow-xl"
        ].join(" "),

        /**
         * Minimal utility button: Brighter inactive state.
         */
        ghost: [
          "bg-transparent",
          "text-white/80",
          "hover:bg-white/10",
          "hover:text-white"
        ].join(" "),

        /**
         * Danger Node: Deep red with projection.
         */
        destructive: [
          "bg-red-500/25",
          "text-white",
          "border border-red-500/50",
          "hover:bg-red-500/35",
          "shadow-[0_4px_25px_rgba(239,68,68,0.35)]"
        ].join(" "),

        /**
         * Link
         */
        link: [
          "bg-transparent",
          "text-primary",
          "underline-offset-4",
          "hover:underline"
        ].join(" "),
      },

      size: {
        sm: "h-8 px-4 rounded-xl text-[9px]",
        default: "h-11 px-6 rounded-2xl text-[10px]",
        lg: "h-14 px-8 rounded-[1.5rem] text-xs",
        xl: "h-18 px-10 rounded-[2.5rem] text-sm",
        icon: "h-10 w-10 rounded-2xl",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
