import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center glass-panel px-3 py-1 subtitle text-xs transition-all focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-neon-blue text-rich-black neon-glow",
        secondary: "border-glass-border text-foreground hover:neon-glow",
        destructive: "bg-red-500 text-white border-red-400",
        outline: "border-neon-blue text-neon-blue hover:bg-neon-blue/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
