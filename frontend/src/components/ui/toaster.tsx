"use client"

import * as React from "react"
import { ToastProvider, ToastViewport } from "./toast"

// Minimal Toaster component to mount the toast viewport/provider.
export function Toaster() {
  return (
    <ToastProvider>
      <ToastViewport />
    </ToastProvider>
  )
}

export default Toaster
