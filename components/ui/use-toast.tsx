import * as React from "react"
import { toast } from "sonner"

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const notify = React.useCallback(({ title, description, variant = "default" }: ToastProps) => {
    if (variant === "destructive") {
      toast.error(description || title)
    } else {
      toast.success(description || title)
    }
  }, [])

  return {
    toast: notify
  }
} 