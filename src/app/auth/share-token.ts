const SHARE_SECRET = 'ki-server-share-v1';
const UPLOAD_SECRET = 'ki-server-upload-v1';

interface SharePayload {
  ip: string;
  port: number;
  fileName: string;
  expiresAt: number;
}

interface UploadPayload {
  ip: string;
  port: number;
  expiresAt: number;
}


function toBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  ));
}

function fromBase64(b64: string): string {
  return decodeURIComponent(atob(b64).split('').map(c =>
    '%' + c.charCodeAt(0).toString(16).padStart(2, '0')
  ).join(''));
}

async function hmacSignWith(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function hmacVerifyWith(secret: string, payload: string, signature: string): Promise<boolean> {
  const expected = await hmacSignWith(secret, payload);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createUploadToken(payload: UploadPayload): Promise<string> {
  const json = JSON.stringify(payload);
  const b64 = toBase64(json);
  const sig = await hmacSignWith(UPLOAD_SECRET, b64);
  return toBase64(JSON.stringify({ d: b64, s: sig }));
}

export async function verifyUploadToken(token: string): Promise<UploadPayload | null> {
  try {
    const { d, s } = JSON.parse(fromBase64(token));
    if (!d || !s) return null;
    const valid = await hmacVerifyWith(UPLOAD_SECRET, d, s);
    if (!valid) return null;
    const payload: UploadPayload = JSON.parse(fromBase64(d));
    if (!payload.ip || !payload.expiresAt) return null;
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createShareToken(payload: SharePayload): Promise<string> {
  const json = JSON.stringify(payload);
  const b64 = toBase64(json);
  const sig = await hmacSignWith(SHARE_SECRET, b64);
  return toBase64(JSON.stringify({ d: b64, s: sig }));
}

export async function verifyShareToken(token: string): Promise<SharePayload | null> {
  try {
    const { d, s } = JSON.parse(fromBase64(token));
    if (!d || !s) return null;

    const valid = await hmacVerifyWith(SHARE_SECRET, d, s);
    if (!valid) return null;

    const payload: SharePayload = JSON.parse(fromBase64(d));
    if (!payload.ip || !payload.fileName || !payload.expiresAt) return null;
    if (Date.now() > payload.expiresAt) return null;

    return payload;
  } catch {
    return null;
  }
}
