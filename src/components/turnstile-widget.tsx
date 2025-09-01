"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string
      ready: (cb: () => void) => void
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

type Props = {
  siteKey?: string
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (err?: unknown) => void
  theme?: "auto" | "light" | "dark"
  size?: "normal" | "compact" | "flexible"
  className?: string
}

export default function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = "auto",
  size = "normal",
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [widgetId, setWidgetId] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [fetchedSiteKey, setFetchedSiteKey] = useState<string>("")

  // Fetch site key from server if prop not provided
  useEffect(() => {
    let mounted = true
    if (!siteKey) {
      fetch("/api/public-config")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((cfg) => {
          if (mounted && cfg?.turnstileSiteKey) setFetchedSiteKey(cfg.turnstileSiteKey as string)
        })
        .catch(() => {})
    }
    return () => {
      mounted = false
    }
  }, [siteKey])

  const actualSiteKey = useMemo(() => siteKey || fetchedSiteKey, [siteKey, fetchedSiteKey])

  // Load Turnstile script once
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.turnstile) {
      setScriptLoaded(true)
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]',
    )
    if (existing) {
      const iv = setInterval(() => {
        if (window.turnstile) {
          clearInterval(iv)
          setScriptLoaded(true)
        }
      }, 100)
      setTimeout(() => clearInterval(iv), 5000)
      return
    }
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = false
    script.defer = false
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => onError?.(new Error("Failed to load Turnstile script"))
    document.head.appendChild(script)
  }, [onError])

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !actualSiteKey) return
    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: actualSiteKey,
        theme,
        size,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onExpire?.(),
        "error-callback": () => onError?.(new Error("Turnstile error")),
      })
      setWidgetId(id)
    } catch (err) {
      onError?.(err)
    }
  }, [actualSiteKey, onError, onExpire, onVerify, size, theme])

  // Render when ready
  useEffect(() => {
    if (!scriptLoaded || !actualSiteKey || !containerRef.current) return
    renderWidget()
  }, [actualSiteKey, renderWidget, scriptLoaded])

  // Cleanup
  useEffect(() => {
    return () => {
      try {
        if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
      } catch {}
    }
  }, [widgetId])

  if (!actualSiteKey) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">CAPTCHA not configured.</p>
      </div>
    )
  }

  return <div ref={containerRef} className={className} aria-live="polite" />
}
