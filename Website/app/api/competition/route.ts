import { bindings } from '../../../lib/server/bindings';
import { errorResponse, json, requireUser } from '../../../lib/server/auth';

const LANGUAGES: Record<string, string> = { py: 'python', cpp: 'cpp', cc: 'cpp', rs: 'rust' };

function base64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

async function aws(path: string, method: string, body?: object) {
  const config = bindings();
  if (!config.AWS_SIMULATION_URL || !config.AWS_SIMULATION_KEY) throw new Error('Competition service is not configured.');
  const response = await fetch(`${config.AWS_SIMULATION_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-gtpoker-key': config.AWS_SIMULATION_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({ error: 'Competition service returned an invalid response.' })) as { error?: string };
  return { response, data };
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const query = new URLSearchParams({ user_id: user.id, email: user.email });
    const { response, data } = await aws(`/competition/state?${query}`, 'GET');
    return json(data, { status: response.status });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const contentType = request.headers.get('content-type') ?? '';
    let action = '';
    let input: Record<string, unknown> = {};
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      action = String(form.get('action') ?? 'submission');
      const file = form.get('file');
      if (!(file instanceof File) || file.size < 1 || file.size > 512 * 1024) {
        return json({ error: 'Choose a source file between 1 byte and 512 KB.' }, { status: 400 });
      }
      const filename = file.name.split(/[\\/]/).pop() ?? 'bot';
      const language = LANGUAGES[filename.split('.').pop()?.toLowerCase() ?? ''];
      if (!language) return json({ error: 'Upload a Python, C++, or Rust source file.' }, { status: 400 });
      input = { filename, language, source_base64: base64(new Uint8Array(await file.arrayBuffer())) };
    } else {
      const value = await request.json() as Record<string, unknown>;
      action = String(value.action ?? '');
      input = value;
    }
    const paths: Record<string, string> = {
      create_team: '/competition/teams', join_team: '/competition/teams/join',
      submission: '/competition/submissions', queue_match: '/competition/matches',
    };
    const path = paths[action];
    if (!path) return json({ error: 'Unknown competition action.' }, { status: 400 });
    const { response, data } = await aws(path, 'POST', { ...input, user_id: user.id, email: user.email });
    return json(data, { status: response.status });
  } catch (error) {
    return errorResponse(error);
  }
}
