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
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasRenderedRef = useRef(false)
  // Stable callback refs to avoid re-rendering widget infinitely
  const verifyRef = useRef(onVerify)
  const expireRef = useRef(onExpire)
  const errorRef = useRef(onError)

  // Keep refs updated without changing function identity in dependencies
  useEffect(() => {
    verifyRef.current = onVerify
  }, [onVerify])
  useEffect(() => {
    expireRef.current = onExpire
  }, [onExpire])
  useEffect(() => {
    errorRef.current = onError
  }, [onError])

  // Fetch site key from server if prop not provided
  useEffect(() => {
    let mounted = true
    if (!siteKey) {
      console.log('TurnstileWidget: Fetching site key from server...')
      fetch("/api/public-config")
        .then((r) => {
          if (!r.ok) {
            throw new Error(`HTTP ${r.status}: ${r.statusText}`)
          }
          return r.json()
        })
        .then((cfg) => {
          console.log('TurnstileWidget: Received config:', cfg)
          if (mounted && cfg?.turnstileSiteKey) {
            setFetchedSiteKey(cfg.turnstileSiteKey as string)
            console.log('TurnstileWidget: Site key set:', cfg.turnstileSiteKey)
          } else {
            console.warn('TurnstileWidget: No turnstileSiteKey in config')
            setError('CAPTCHA not configured on server')
          }
          setIsLoading(false)
        })
        .catch((err) => {
          console.error('TurnstileWidget: Failed to fetch config:', err)
          setError(`Failed to load CAPTCHA configuration: ${err.message}`)
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
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
      console.log('TurnstileWidget: Script already loaded')
      setScriptLoaded(true)
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]',
    )
    if (existing) {
      console.log('TurnstileWidget: Script tag exists, waiting for window.turnstile...')
      const iv = setInterval(() => {
        if (window.turnstile) {
          console.log('TurnstileWidget: window.turnstile now available')
          clearInterval(iv)
          setScriptLoaded(true)
        }
      }, 100)
      setTimeout(() => {
        clearInterval(iv)
        if (!window.turnstile) {
          console.error('TurnstileWidget: Timeout waiting for turnstile script')
          setError('CAPTCHA script failed to load')
        }
      }, 10000)
      return
    }
    console.log('TurnstileWidget: Loading Turnstile script...')
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = false
    script.defer = false
    script.onload = () => {
      console.log('TurnstileWidget: Script loaded successfully')
      setScriptLoaded(true)
    }
    script.onerror = (e) => {
      console.error('TurnstileWidget: Script failed to load:', e)
      const errorMsg = 'Failed to load CAPTCHA script'
      setError(errorMsg)
      onError?.(new Error(errorMsg))
    }
    document.head.appendChild(script)
  }, [onError])

  const renderWidget = useCallback(() => {
    if (hasRenderedRef.current) return // already rendered, don't duplicate
    if (!containerRef.current || !window.turnstile || !actualSiteKey) return
    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: actualSiteKey,
        theme,
        size,
        callback: (token: string) => {
          verifyRef.current?.(token)
        },
        "expired-callback": () => {
          expireRef.current?.()
        },
        "error-callback": (err: any) => {
            const errorMsg = 'CAPTCHA verification failed'
            setError(errorMsg)
            errorRef.current?.(new Error(errorMsg))
        },
      })
      setWidgetId(id)
      hasRenderedRef.current = true
    } catch (err) {
      setError('Failed to initialize CAPTCHA')
      errorRef.current?.(err)
    }
  }, [actualSiteKey, size, theme])

  // Render when ready
  useEffect(() => {
  if (!scriptLoaded || !actualSiteKey || !containerRef.current) return
  renderWidget()
  }, [actualSiteKey, renderWidget, scriptLoaded])

  // Cleanup
  useEffect(() => {
    return () => {
      try {
        if (widgetId && window.turnstile) {
          window.turnstile.remove(widgetId)
        }
      } catch (e) {
        console.warn('TurnstileWidget: Cleanup error:', e)
      }
    }
  }, [widgetId])

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-sm text-gray-600">Loading CAPTCHA...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="p-4 border border-red-300 rounded-lg bg-red-50">
          <p className="text-sm text-red-600">⚠️ {error}</p>
          <p className="text-xs text-red-500 mt-1">Check console for details</p>
        </div>
      </div>
    )
  }

  if (!actualSiteKey) {
    return (
      <div className={className}>
        <div className="p-4 border border-yellow-300 rounded-lg bg-yellow-50">
          <p className="text-sm text-yellow-700">⚠️ CAPTCHA not configured</p>
          <p className="text-xs text-yellow-600 mt-1">Set TURNSTILE_SITE_KEY in environment</p>
        </div>
      </div>
    )
  }

  return <div ref={containerRef} className={className} aria-live="polite" />
}
