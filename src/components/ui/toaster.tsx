
"use client"

// Import from sonner
import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster 
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        classNames: {
          toast: "group toast font-sans text-foreground rounded-md border bg-background p-4 shadow-lg",
          title: "text-sm font-semibold",
          description: "text-sm opacity-90",
        }
      }}
    />
  )
}
