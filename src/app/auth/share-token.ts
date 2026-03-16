const SHARE_SECRET = 'ki-server-share-v1';

interface SharePayload {
  ip: string;
  port: number;
  fileName: string;
  expiresAt: number;
}

async function hmacSign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SHARE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function hmacVerify(payload: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(payload);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createShareToken(payload: SharePayload): Promise<string> {
  const json = JSON.stringify(payload);
  const b64 = btoa(json);
  const sig = await hmacSign(b64);
  return btoa(JSON.stringify({ d: b64, s: sig }));
}

export async function verifyShareToken(token: string): Promise<SharePayload | null> {
  try {
    const { d, s } = JSON.parse(atob(token));
    if (!d || !s) return null;

    const valid = await hmacVerify(d, s);
    if (!valid) return null;

    const payload: SharePayload = JSON.parse(atob(d));
    if (!payload.ip || !payload.fileName || !payload.expiresAt) return null;
    if (Date.now() > payload.expiresAt) return null;

    return payload;
  } catch {
    return null;
  }
}
