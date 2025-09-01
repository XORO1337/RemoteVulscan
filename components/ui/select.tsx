"use client"
import type * as React from "react"

export function Select({
  value,
  onValueChange,
  children,
}: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) {
  // Minimal native select wrapper for compatibility
  return <div>{children}</div>
}

export function SelectTrigger({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="button" className={className} {...props}>
      {children}
    </div>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>
}

export function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

export function SelectItem({
  value,
  children,
  onClick,
}: { value: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div role="option" onClick={onClick} data-value={value}>
      {children}
    </div>
  )
}
