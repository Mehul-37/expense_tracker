import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Mobile-First: 48px min-height, 16px font-size (prevents iOS zoom)
          "flex h-12 min-h-[48px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-base md:text-sm md:h-10 md:min-h-[40px] md:px-3 md:py-2",
          "text-foreground ring-offset-background",
          "file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground md:file:text-sm",
          "placeholder:text-muted-foreground",
          // Touch-optimized focus states
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Better touch interaction
          "touch-manipulation transition-all duration-200",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
