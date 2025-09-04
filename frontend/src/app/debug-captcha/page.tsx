"use client"

import { useState, useEffect } from "react"
import TurnstileWidget from "@/components/turnstile-widget"

export default function CaptchaDebug() {
  const [config, setConfig] = useState<any>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/public-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">CAPTCHA Debug Page</h1>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Environment Check</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">CAPTCHA Widget</h2>
        <div className="border border-gray-300 p-4 rounded-lg">
          <TurnstileWidget
            onVerify={(token) => {
              setCaptchaToken(token)
              console.log('CAPTCHA verified:', token)
            }}
            onExpire={() => {
              setCaptchaToken(null)
              console.log('CAPTCHA expired')
            }}
            onError={(err) => {
              setError(err?.toString() || 'Unknown error')
              console.error('CAPTCHA error:', err)
            }}
            className="w-full"
          />
        </div>
        
        {captchaToken && (
          <div className="bg-green-100 p-4 rounded-lg">
            <p className="text-green-800 font-semibold">✅ CAPTCHA Verified!</p>
            <p className="text-xs text-green-600 mt-1 break-all">Token: {captchaToken}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 p-4 rounded-lg">
            <p className="text-red-800 font-semibold">❌ Error:</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Instructions</h2>
        <div className="bg-blue-100 p-4 rounded-lg text-sm">
          <p className="font-semibold text-blue-800">If CAPTCHA doesn't show:</p>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-700">
            <li>Check browser console for errors</li>
            <li>Verify TURNSTILE_SITE_KEY is set in .env</li>
            <li>Ensure you're using valid Turnstile keys</li>
            <li>Check network tab for failed script loading</li>
            <li>Try refreshing the page</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
