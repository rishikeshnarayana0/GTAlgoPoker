import { bindings } from '../../../lib/server/bindings';
import { errorResponse, json, requireUser, sha256 } from '../../../lib/server/auth';
import { ensureSchema } from '../../../lib/server/schema';

const MAX_FILE_BYTES = 512 * 1024;
const LANGUAGES: Record<string, string> = { py: 'python', cpp: 'cpp', cc: 'cpp', rs: 'rust' };

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const user = await requireUser(request);
    const rows = await bindings().DB.prepare(
      `SELECT bots.id AS bot_id, bots.name, bots.created_at AS bot_created_at,
              bot_versions.id AS version_id, bot_versions.version_number, bot_versions.language,
              bot_versions.filename, bot_versions.sha256, bot_versions.size_bytes,
              bot_versions.compile_status, bot_versions.created_at
       FROM bots LEFT JOIN bot_versions ON bot_versions.bot_id = bots.id
       WHERE bots.user_id = ? ORDER BY bots.updated_at DESC, bot_versions.version_number DESC`,
    ).bind(user.id).all<Record<string, unknown>>();
    return json({ bots: rows.results });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let objectKey: string | null = null;
  try {
    await ensureSchema();
    const user = await requireUser(request);
    const form = await request.formData();
    const file = form.get('file');
    const name = typeof form.get('name') === 'string' ? String(form.get('name')).trim() : '';
    if (!(file instanceof File)) return json({ error: 'Choose a bot source file.' }, { status: 400 });
    if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,49}$/.test(name)) return json({ error: 'Bot name must be 2–50 letters, numbers, spaces, dashes, or underscores.' }, { status: 400 });
    if (file.size === 0 || file.size > MAX_FILE_BYTES) return json({ error: 'Source files must be between 1 byte and 512 KB.' }, { status: 400 });
    const filename = file.name.split(/[\\/]/).pop() ?? 'bot';
    const extension = filename.split('.').pop()?.toLowerCase() ?? '';
    const language = LANGUAGES[extension];
    if (!language) return json({ error: 'Upload a Python (.py), C++ (.cpp/.cc), or Rust (.rs) source file.' }, { status: 400 });

    const db = bindings().DB;
    const now = Date.now();
    let bot = await db.prepare('SELECT id FROM bots WHERE user_id = ? AND name = ?').bind(user.id, name).first<{ id: string }>();
    if (!bot) {
      bot = { id: crypto.randomUUID() };
      await db.prepare('INSERT INTO bots (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(bot.id, user.id, name, now, now).run();
    }
    const latest = await db.prepare('SELECT COALESCE(MAX(version_number), 0) AS number FROM bot_versions WHERE bot_id = ?').bind(bot.id).first<{ number: number }>();
    const versionNumber = (latest?.number ?? 0) + 1;
    const versionId = crypto.randomUUID();
    const contents = await file.arrayBuffer();
    const digest = await sha256(contents);
    objectKey = `users/${user.id}/bots/${bot.id}/versions/${versionId}/${filename}`;
    await bindings().BOT_FILES.put(objectKey, contents, {
      customMetadata: { userId: user.id, botId: bot.id, versionId, language, sha256: digest },
      httpMetadata: { contentType: file.type || 'text/plain' },
    });
    await db.batch([
      db.prepare(`INSERT INTO bot_versions (id, bot_id, version_number, language, filename, object_key, sha256, size_bytes, compile_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
        .bind(versionId, bot.id, versionNumber, language, filename, objectKey, digest, file.size, now),
      db.prepare('UPDATE bots SET updated_at = ? WHERE id = ?').bind(now, bot.id),
    ]);
    return json({ ok: true, version: { id: versionId, versionNumber, language, filename } }, { status: 201 });
  } catch (error) {
    if (objectKey) await bindings().BOT_FILES.delete(objectKey).catch(() => undefined);
    return errorResponse(error);
  }
}
