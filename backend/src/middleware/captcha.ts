import { Request, Response as ExpressResponse, NextFunction } from 'express';
import { logger } from '@/utils/logger';

interface TurnstileVerifyResponse {
  success: boolean;
  [key: string]: any; // other fields like challenge_ts, hostname, error-codes
  'error-codes'?: string[];
}

// Helper to perform a POST with timeout using native fetch (Node 18+)
async function postFormWithTimeout(url: string, body: URLSearchParams, timeoutMs = 4000): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Turnstile captcha verification middleware.
 * - If TURNSTILE_SECRET_KEY is not set, it becomes a no-op (development convenience).
 * - Expects token in req.body.captchaToken (frontend provides it).
 */
export async function verifyCaptcha(req: Request, res: ExpressResponse, next: NextFunction) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Captcha disabled
    return next();
  }

  const token = req.body?.captchaToken;
  if (!token) {
    return res.status(400).json({ error: 'captchaToken is required' });
  }

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
      remoteip: req.ip || '',
    });
  const verifyResp = await postFormWithTimeout('https://challenges.cloudflare.com/turnstile/v0/siteverify', params);
  const data = (await verifyResp.json()) as unknown as TurnstileVerifyResponse;
    if (!data.success) {
      logger.warn('Turnstile verification failed', { errors: data['error-codes'] });
      return res.status(403).json({ error: 'CAPTCHA verification failed', codes: data['error-codes'] });
    }
    return next();
  } catch (err: any) {
    logger.error('Turnstile verification error', { message: err?.message });
    return res.status(502).json({ error: 'CAPTCHA verification error', message: err?.message });
  }
}
