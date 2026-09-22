import { bindings } from '../../../lib/server/bindings';
import { errorResponse, json, requireUser } from '../../../lib/server/auth';
import { ensureSchema } from '../../../lib/server/schema';

const MAX_FILE_BYTES = 512 * 1024;
const LANGUAGES: Record<string, string> = { py: 'python', cpp: 'cpp', cc: 'cpp', rs: 'rust' };
const OPPONENTS = new Set(['tight', 'loose', 'polarized', 'aggressive', 'basic', 'unexploitable']);

type UploadedPlayer = { kind: 'uploaded'; language: string; source_base64: string; version_id: string | null; name: string };

async function awsRequest(path: string, init: RequestInit = {}) {
  const env = bindings();
  if (!env.AWS_SIMULATION_URL || !env.AWS_SIMULATION_KEY) throw new Error('Simulation service is not configured.');
  const response = await fetch(`${env.AWS_SIMULATION_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-gtpoker-key': env.AWS_SIMULATION_KEY, ...init.headers },
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Simulation service rejected the request.');
  return data;
}

function encodeBase64(contents: ArrayBuffer) {
  const bytes = new Uint8Array(contents);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function loadVersion(versionId: string, userId: string): Promise<UploadedPlayer | null> {
  const row = await bindings().DB.prepare(
    `SELECT bot_versions.id, bot_versions.language, bot_versions.object_key, bots.name
     FROM bot_versions JOIN bots ON bots.id = bot_versions.bot_id
     WHERE bot_versions.id = ? AND bots.user_id = ?`,
  ).bind(versionId, userId).first<{ id: string; language: string; object_key: string; name: string }>();
  if (!row) return null;
  const object = await bindings().BOT_FILES.get(row.object_key);
  if (!object) return null;
  return { kind: 'uploaded', language: row.language, source_base64: encodeBase64(await object.arrayBuffer()), version_id: row.id, name: row.name };
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const user = await requireUser(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      const rows = await bindings().DB.prepare('SELECT * FROM matches WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(user.id).all();
      return json({ matches: rows.results });
    }
    const row = await bindings().DB.prepare('SELECT * FROM matches WHERE id = ? AND user_id = ?').bind(id, user.id).first<Record<string, unknown>>();
    if (!row) return json({ error: 'Match not found.' }, { status: 404 });
    if (!['complete', 'failed'].includes(String(row.status))) {
      const remote = await awsRequest(`/matches/${encodeURIComponent(id)}?user_id=${encodeURIComponent(user.id)}`);
      const status = String(remote.status ?? 'running');
      const resultJson = remote.result ? JSON.stringify(remote.result) : null;
      const errorMessage = typeof remote.error_message === 'string' ? remote.error_message : null;
      await bindings().DB.prepare('UPDATE matches SET status = ?, result_json = ?, error_message = ?, updated_at = ? WHERE id = ?')
        .bind(status, resultJson, errorMessage, Date.now(), id).run();
      return json({ match: { ...row, status, result_json: resultJson, error_message: errorMessage } });
    }
    return json({ match: row });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const user = await requireUser(request);
    const form = await request.formData();
    const versionId = String(form.get('versionId') ?? '');
    const opponents = JSON.parse(String(form.get('opponents') ?? '[]')) as unknown;
    if (!Array.isArray(opponents) || opponents.length !== 5 || opponents.some((item) => typeof item !== 'string')) {
      return json({ error: 'Choose exactly five valid opponents.' }, { status: 400 });
    }
    let selectedVersion: string | null = null;
    let hero: UploadedPlayer;
    if (versionId) {
      const loaded = await loadVersion(versionId, user.id);
      if (!loaded) return json({ error: 'Bot version not found.' }, { status: 404 });
      hero = loaded; selectedVersion = loaded.version_id;
    } else {
      const file = form.get('file');
      if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_BYTES) return json({ error: 'Choose a source file up to 512 KB.' }, { status: 400 });
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const language = LANGUAGES[extension];
      if (!language) return json({ error: 'Upload a Python, C++, or Rust source file.' }, { status: 400 });
      hero = { kind: 'uploaded', language, source_base64: encodeBase64(await file.arrayBuffer()), version_id: null, name: file.name };
    }
    const players: Array<Record<string, unknown>> = [{ ...hero, player_id: 'hero', seat: 0, name: hero.name || 'Your Bot' }];
    for (let index = 0; index < opponents.length; index += 1) {
      const selection = opponents[index];
      const playerId = `opponent-${index + 1}`;
      if (selection.startsWith('builtin:')) {
        const strategy = selection.slice('builtin:'.length);
        if (!OPPONENTS.has(strategy)) return json({ error: 'Invalid built-in opponent.' }, { status: 400 });
        players.push({ kind: 'builtin', strategy, player_id: playerId, seat: index + 1, name: `${strategy} Bot` });
      } else if (selection.startsWith('version:')) {
        const loaded = await loadVersion(selection.slice('version:'.length), user.id);
        if (!loaded) return json({ error: `Uploaded opponent ${index + 1} was not found.` }, { status: 404 });
        players.push({ ...loaded, player_id: playerId, seat: index + 1 });
      } else {
        return json({ error: 'Invalid opponent selection.' }, { status: 400 });
      }
    }
    const payload = await awsRequest('/matches', { method: 'POST', body: JSON.stringify({
      user_id: user.id,
      players,
      max_hands: 250,
    }) });
    const id = String(payload.id);
    const now = Date.now();
    await bindings().DB.prepare('INSERT INTO matches (id, user_id, bot_version_id, opponents_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, user.id, selectedVersion, JSON.stringify(opponents), 'running', now, now).run();
    return json({ match: { id, status: 'running' } }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
