import { bindings } from '../../../../lib/server/bindings';
import { errorResponse, json, SESSION_COOKIE, sha256 } from '../../../../lib/server/auth';

export async function POST(request: Request) {
  try {
    const cookie = request.headers.get('cookie') ?? '';
    const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    if (token) await bindings().DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(decodeURIComponent(token))).run();
    return json({ ok: true }, { headers: { 'set-cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
  } catch (error) {
    return errorResponse(error);
  }
}
