import { bindings } from '../../../../lib/server/bindings';
import { createSession, errorResponse, isGatechEmail, json, normalizeEmail, verifyPassword } from '../../../../lib/server/auth';
import { ensureSchema } from '../../../../lib/server/schema';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json() as { email?: unknown; password?: unknown };
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!isGatechEmail(email) || !password) return json({ error: 'Email or password is incorrect.' }, { status: 401 });
    const user = await bindings().DB.prepare(`SELECT id, password_hash FROM users WHERE email = ? AND status = 'verified'`)
      .bind(email).first<{ id: string; password_hash: string }>();
    if (!user || !await verifyPassword(password, user.password_hash)) {
      return json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }
    const session = await createSession(user.id);
    return json({ ok: true }, { headers: { 'set-cookie': session.cookie } });
  } catch (error) {
    return errorResponse(error);
  }
}
