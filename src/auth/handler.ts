import type { AuthMode, AuthSource, AuthStatusResponse, Result } from "../shared/rpcTypes";
import {
  generateSalt,
  hashPassword,
  signSessionToken,
  timingSafeStringCompare,
  verifySessionToken,
} from "./crypto";

function json<T>(data: Result<T>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// In-memory fallback generated on the fly if D1 has a transient outage; never static or hardcoded
let ephemeralSigningSecret: string | null = null;

/**
 * Retrieves or generates a stable HMAC secret for signing session tokens.
 */
export async function getSigningSecret(env: Env): Promise<string> {
  if (env.AUTH_SECRET && env.AUTH_SECRET.trim().length > 0) {
    return env.AUTH_SECRET.trim();
  }

  try {
    const row = await env.DB
      .prepare("SELECT value FROM app_settings WHERE key = 'auth_secret'")
      .first<{ value: string }>();

    if (row && row.value && row.value.trim().length > 0) {
      return row.value.trim();
    }

    const newSecret = generateSalt() + generateSalt();
    await env.DB
      .prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('auth_secret', ?)")
      .bind(newSecret)
      .run();

    const stored = await env.DB
      .prepare("SELECT value FROM app_settings WHERE key = 'auth_secret'")
      .first<{ value: string }>();

    return stored?.value || newSecret;
  } catch (err) {
    console.error("Failed to query or store auth_secret in D1:", err);
    if (!ephemeralSigningSecret) {
      ephemeralSigningSecret = generateSalt() + generateSalt() + generateSalt();
    }
    return ephemeralSigningSecret;
  }
}

/**
 * Determines current authentication mode and source.
 */
export async function getAuthMode(env: Env): Promise<{ mode: AuthMode; source: AuthSource }> {
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.trim().length > 0) {
    return { mode: "enforced", source: "env" };
  }

  try {
    const row = await env.DB
      .prepare("SELECT value FROM app_settings WHERE key = 'admin_password_hash'")
      .first<{ value: string }>();

    if (row && row.value && row.value.trim().length > 0) {
      return { mode: "enforced", source: "d1" };
    }
  } catch (err) {
    console.error("Failed to check admin_password_hash in D1:", err);
  }

  return { mode: "open", source: "none" };
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

/**
 * Validates whether the incoming request has a valid admin session token.
 */
export async function isRequestAuthenticated(request: Request, env: Env): Promise<boolean> {
  const token = extractBearerToken(request);
  if (!token) return false;

  const secret = await getSigningSecret(env);
  const result = await verifySessionToken(token, secret);
  return result.valid;
}

/**
 * GET /api/auth/status
 */
export async function handleAuthStatus(request: Request, env: Env): Promise<Response> {
  const { mode, source } = await getAuthMode(env);
  const authenticated = await isRequestAuthenticated(request, env);

  const statusData: AuthStatusResponse = {
    mode,
    source,
    authenticated: mode === "open" ? true : authenticated,
  };

  return json({ ok: true, data: statusData });
}

/**
 * POST /api/auth/login
 */
export async function handleAuthLogin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  const inputPassword = typeof body.password === "string" ? body.password : "";

  if (!inputPassword) {
    return json({ ok: false, errorCode: 400, description: "Password is required", reason: "invalid_request" }, 400);
  }

  if (inputPassword.length > 256) {
    return json({ ok: false, errorCode: 400, description: "Password exceeds maximum length (256 characters)", reason: "invalid_request" }, 400);
  }

  const { mode, source } = await getAuthMode(env);

  let verified = false;

  if (source === "env") {
    const expected = env.ADMIN_PASSWORD ?? "";
    verified = await timingSafeStringCompare(inputPassword, expected);
  } else if (source === "d1") {
    try {
      const rows = await env.DB
        .prepare("SELECT key, value FROM app_settings WHERE key IN ('admin_password_hash', 'admin_password_salt')")
        .all<{ key: string; value: string }>();

      const hashRow = rows.results.find((r) => r.key === "admin_password_hash");
      const saltRow = rows.results.find((r) => r.key === "admin_password_salt");

      if (hashRow && saltRow) {
        const computedHash = await hashPassword(inputPassword, saltRow.value);
        verified = await timingSafeStringCompare(computedHash, hashRow.value);
      }
    } catch (err) {
      console.error("Failed to verify D1 password:", err);
    }
  } else {
    // Mode is open, any or no password can enter
    verified = true;
  }

  if (!verified) {
    return json({ ok: false, errorCode: 401, description: "Invalid password", reason: "unauthorized" }, 401);
  }

  const secret = await getSigningSecret(env);
  const token = await signSessionToken(
    {
      sub: "admin",
      iat: Date.now(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    secret,
  );

  return json({ ok: true, data: { token } });
}

/**
 * POST /api/auth/setup
 *
 * Configures master password in D1 if not currently set via environment variable or existing D1 setting.
 */
export async function handleAuthSetup(request: Request, env: Env): Promise<Response> {
  const { mode, source } = await getAuthMode(env);

  if (source === "env") {
    return json(
      {
        ok: false,
        errorCode: 400,
        description: "Password is configured via environment variable ADMIN_PASSWORD",
        reason: "invalid_request",
      },
      400,
    );
  }

  if (source === "d1") {
    // If already configured in D1, only an authenticated session can reset it
    const isAuthed = await isRequestAuthenticated(request, env);
    if (!isAuthed) {
      return json(
        {
          ok: false,
          errorCode: 401,
          description: "Existing admin password must be authenticated to reconfigure",
          reason: "unauthorized",
        },
        401,
      );
    }
  }

  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  const newPassword = typeof body.password === "string" ? body.password : "";

  if (!newPassword || newPassword.length < 4) {
    return json(
      {
        ok: false,
        errorCode: 400,
        description: "Password must be at least 4 characters",
        reason: "invalid_request",
      },
      400,
    );
  }

  if (newPassword.length > 256) {
    return json(
      {
        ok: false,
        errorCode: 400,
        description: "Password exceeds maximum length (256 characters)",
        reason: "invalid_request",
      },
      400,
    );
  }

  const salt = generateSalt();
  const hash = await hashPassword(newPassword, salt);

  await env.DB.batch([
    env.DB.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('admin_password_hash', ?)").bind(hash),
    env.DB.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('admin_password_salt', ?)").bind(salt),
  ]);

  const secret = await getSigningSecret(env);
  const token = await signSessionToken(
    {
      sub: "admin",
      iat: Date.now(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    },
    secret,
  );

  return json({ ok: true, data: { token } });
}

/**
 * POST /api/auth/remove
 *
 * Removes D1 password protection and returns console to open access mode.
 */
export async function handleAuthRemove(request: Request, env: Env): Promise<Response> {
  const { source } = await getAuthMode(env);

  if (source === "env") {
    return json(
      {
        ok: false,
        errorCode: 400,
        description: "Cannot remove password managed by ADMIN_PASSWORD environment variable",
        reason: "invalid_request",
      },
      400,
    );
  }

  const isAuthed = await isRequestAuthenticated(request, env);
  if (!isAuthed) {
    return json(
      { ok: false, errorCode: 401, description: "Authentication required", reason: "unauthorized" },
      401,
    );
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM app_settings WHERE key = 'admin_password_hash'"),
    env.DB.prepare("DELETE FROM app_settings WHERE key = 'admin_password_salt'"),
  ]);

  return json({ ok: true, data: { status: "removed" } });
}

/**
 * Route protection middleware for /api/* endpoints.
 *
 * Returns null if request is allowed, or a 401 Response if rejected.
 */
export async function authenticateApiRequest(request: Request, env: Env): Promise<Response | null> {
  const { mode } = await getAuthMode(env);

  // If in open mode, allow access
  if (mode === "open") {
    return null;
  }

  // Otherwise, require valid bearer token
  const authenticated = await isRequestAuthenticated(request, env);
  if (authenticated) {
    return null;
  }

  return json(
    {
      ok: false,
      errorCode: 401,
      description: "Admin authentication required",
      reason: "unauthorized",
    },
    401,
  );
}
