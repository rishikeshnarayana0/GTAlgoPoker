import { bindings } from './bindings';
import { ensureSchema } from './schema';

export const SESSION_COOKIE = 'gtpoker_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  email: string;
  status: string;
  role: 'user' | 'admin';
}

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function isGatechEmail(email: string) {
  return email.endsWith('@gatech.edu');
}

export function isAdminEmail(email: string) {
  const configured = bindings().ADMIN_EMAILS ?? '';
  return configured.split(',').map((item) => item.trim().toLowerCase()).includes(email);
}

export function randomToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256(value: string | ArrayBuffer) {
  const input = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashCode(email: string, code: string) {
  const secret = bindings().AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return sha256(`${secret}:${email}:${code}`);
}

export async function hashPassword(password: string, salt = randomToken(16)) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 },
    key,
    256,
  );
  const digest = Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `pbkdf2_sha256$100000$${salt}$${digest}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterations, salt] = stored.split('$');
  if (algorithm !== 'pbkdf2_sha256' || iterations !== '100000' || !salt) return false;
  const candidate = await hashPassword(password, salt);
  if (candidate.length !== stored.length) return false;
  let difference = 0;
  for (let index = 0; index < candidate.length; index += 1) difference |= candidate.charCodeAt(index) ^ stored.charCodeAt(index);
  return difference === 0;
}

function cookieValue(request: Request, name: string) {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

export async function sessionUser(request: Request): Promise<SessionUser | null> {
  await ensureSchema();
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Date.now();
  const row = await bindings().DB.prepare(
    `SELECT users.id, users.email, users.status, users.role
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.status = 'verified'`,
  ).bind(tokenHash, now).first<SessionUser>();
  return row ?? null;
}

export async function requireUser(request: Request) {
  const user = await sessionUser(request);
  if (!user) throw new Response('Authentication required', { status: 401 });
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if (user.role !== 'admin') throw new Response('Administrator access required', { status: 403 });
  return user;
}

export async function createSession(userId: string) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = Date.now();
  await bindings().DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).bind(tokenHash, userId, now + SESSION_SECONDS * 1000, now).run();
  return {
    token,
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`,
  };
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  return json({ error: 'Something went wrong.' }, { status: 500 });
}
