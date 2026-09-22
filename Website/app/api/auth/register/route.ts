import { bindings } from '../../../../lib/server/bindings';
import { createSession, errorResponse, hashPassword, isGatechEmail, isValidEmail, json, normalizeEmail } from '../../../../lib/server/auth';
import { ensureSchema } from '../../../../lib/server/schema';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json() as { email?: unknown; password?: unknown };
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!isValidEmail(email) || !isGatechEmail(email)) return json({ error: 'Use your @gatech.edu email address.' }, { status: 400 });
    if (password.length < 10 || password.length > 128) return json({ error: 'Password must be 10–128 characters.' }, { status: 400 });

    const db = bindings().DB;
    if (await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()) return json({ error: 'An account already exists for this email.' }, { status: 409 });
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.prepare(`INSERT INTO users (id, email, password_hash, status, role, verified_at, created_at, updated_at) VALUES (?, ?, ?, 'verified', 'user', ?, ?, ?)`)
      .bind(id, email, await hashPassword(password), now, now, now).run();
    const session = await createSession(id);
    return json({ ok: true }, { status: 201, headers: { 'set-cookie': session.cookie } });
  } catch (error) {
    return errorResponse(error);
  }
}
