/* ==========================================================================
   Admin auth — one shared password (ADMIN_PASSWORD) exchanged for a
   stateless HMAC-SHA256 signed token: base64url(payload).base64url(sig).
   ========================================================================== */
import crypto from 'node:crypto';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
/** Local-only default. Production must set ADMIN_PASSWORD (the server warns at boot). */
export const DEFAULT_ADMIN_PASSWORD = 'adelia-room-local';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function createAuth({ password, secret, log = console }) {
  if (!password) {
    password = DEFAULT_ADMIN_PASSWORD;
    log.warn(`[auth] ADMIN_PASSWORD is not set — using the local default "${DEFAULT_ADMIN_PASSWORD}". Set ADMIN_PASSWORD before going live!`);
  }
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    log.warn('[auth] ADMIN_SECRET is not set — using a random per-boot secret (admin sessions end when the server restarts).');
  }
  const key = Buffer.from(String(secret));
  const sign = (s) => crypto.createHmac('sha256', key).update(s).digest();
  // compare digests so the comparison is constant-time regardless of length
  const pwDigest = sign('pw:' + password);

  return {
    ttl: TOKEN_TTL_MS,
    checkPassword(candidate) {
      if (typeof candidate !== 'string' || !candidate || candidate.length > 256) return false;
      return crypto.timingSafeEqual(sign('pw:' + candidate), pwDigest);
    },
    issue(now = Date.now()) {
      const payload = b64u(JSON.stringify({ sub: 'admin', aud: 'adelia-room', iat: now, exp: now + TOKEN_TTL_MS, n: crypto.randomBytes(6).toString('hex') }));
      return `${payload}.${b64u(sign(payload))}`;
    },
    verify(token, now = Date.now()) {
      if (typeof token !== 'string' || token.length > 600) return false;
      const dot = token.indexOf('.');
      if (dot < 1) return false;
      const payload = token.slice(0, dot);
      let sig;
      try {
        sig = Buffer.from(token.slice(dot + 1), 'base64url');
      } catch {
        return false;
      }
      const expected = sign(payload);
      if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return false;
      try {
        const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return p.sub === 'admin' && p.aud === 'adelia-room' && typeof p.exp === 'number' && p.exp > now;
      } catch {
        return false;
      }
    },
  };
}

/** Pull a bearer token from the Authorization header, or ?token= when allowed. */
export function tokenFrom(req, url, allowQuery = false) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (m) return m[1].trim();
  if (allowQuery) return url.searchParams.get('token') || '';
  return '';
}
