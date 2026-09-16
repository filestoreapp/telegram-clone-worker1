import {
  deleteSavedTask,
  getSavedTask,
  insertSavedTask,
  listSavedTasks,
  type NewSavedTask,
} from "../../db/queries";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export async function handleListSavedTasks(env: Env): Promise<Response> {
  const saved = await listSavedTasks(env.DB);
  return json({ ok: true, data: saved });
}

/** Only reachable via an explicit "Restart" click — the one place a saved
 * task's raw bot token is allowed to leave the server, since the user is
 * deliberately asking to reuse it. */
export async function handleGetSavedTask(env: Env, id: string): Promise<Response> {
  const saved = await getSavedTask(env.DB, id);
  if (!saved) return json({ ok: false, errorCode: 404, description: "saved task not found", reason: "invalid_request" }, 404);
  return json({ ok: true, data: saved });
}

export async function handleCreateSavedTask(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as Omit<NewSavedTask, "id">;
  const id = crypto.randomUUID();
  await insertSavedTask(env.DB, { ...body, id });
  return json({ ok: true, data: { id } }, 201);
}

/** Deletes only the template row — never touches the underlying bot or
 * live task, if either still exists. */
export async function handleDeleteSavedTask(env: Env, id: string): Promise<Response> {
  await deleteSavedTask(env.DB, id);
  return json({ ok: true, data: null });
}
