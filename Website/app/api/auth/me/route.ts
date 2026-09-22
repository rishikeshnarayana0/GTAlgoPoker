import { errorResponse, json, sessionUser } from '../../../../lib/server/auth';

export async function GET(request: Request) {
  try {
    return json({ user: await sessionUser(request) });
  } catch (error) {
    return errorResponse(error);
  }
}
