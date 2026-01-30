import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Mobile-First: Touch-optimized base styles
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover/90 shadow-lg shadow-primary/25",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
        outline: "border border-border bg-transparent hover:bg-surface-hover hover:text-foreground active:bg-surface-hover/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-surface-hover hover:text-foreground active:bg-surface-hover/80",
        link: "text-primary underline-offset-4 hover:underline active:opacity-80",
      },
      size: {
        // Mobile-First: Minimum 48px touch targets
        default: "h-12 min-h-[48px] px-4 py-2 md:h-10 md:min-h-[40px]",
        sm: "h-10 min-h-[40px] rounded-md px-3 md:h-9 md:min-h-[36px]",
        lg: "h-14 min-h-[56px] rounded-lg px-8 md:h-12 md:min-h-[48px]",
        xl: "h-16 min-h-[64px] rounded-xl px-10 text-base md:h-14 md:min-h-[56px]",
        icon: "h-12 w-12 min-h-[48px] min-w-[48px] md:h-10 md:w-10 md:min-h-[40px] md:min-w-[40px]",
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
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
