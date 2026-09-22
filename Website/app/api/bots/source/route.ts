import { bindings } from '../../../../lib/server/bindings';
import { errorResponse, json, requireUser } from '../../../../lib/server/auth';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing version id.' }, { status: 400 });
    const row = await bindings().DB.prepare(
      `SELECT bot_versions.object_key, bot_versions.filename FROM bot_versions
       JOIN bots ON bots.id = bot_versions.bot_id WHERE bot_versions.id = ? AND bots.user_id = ?`,
    ).bind(id, user.id).first<{ object_key: string; filename: string }>();
    if (!row) return json({ error: 'Version not found.' }, { status: 404 });
    const object = await bindings().BOT_FILES.get(row.object_key);
    if (!object) return json({ error: 'Source file not found.' }, { status: 404 });
    return new Response(object.body, { headers: { 'content-type': object.httpMetadata?.contentType ?? 'text/plain', 'content-disposition': `attachment; filename="${row.filename.replace(/["\r\n]/g, '')}"` } });
  } catch (error) {
    return errorResponse(error);
  }
}
