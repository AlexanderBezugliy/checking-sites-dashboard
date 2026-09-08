export type DashboardUser = {
  user: string;
  password: string;
};

/** `anna:secret,ivan:secret2`. Пароль может содержать `:`. */
export function parseDashboardUsers(raw: string | undefined): DashboardUser[] {
  if (!raw?.trim()) return [];
  const users: DashboardUser[] = [];
  for (const part of raw.split(",")) {
    const item = part.trim();
    const colon = item.indexOf(":");
    if (colon <= 0) continue;
    const user = item.slice(0, colon).trim();
    const password = item.slice(colon + 1);
    if (!user || !password) continue;
    users.push({ user, password });
  }
  return users;
}

function safeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export function authorizeBasic(
  header: string | null,
  users: DashboardUser[],
): boolean {
  if (!header || users.length === 0) return false;
  const space = header.indexOf(" ");
  if (space < 0) return false;
  const scheme = header.slice(0, space);
  const encoded = header.slice(space + 1).trim();
  if (scheme.toLowerCase() !== "basic" || !encoded) return false;
  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const colon = decoded.indexOf(":");
  if (colon < 0) return false;
  const user = decoded.slice(0, colon);
  const password = decoded.slice(colon + 1);
  let ok = false;
  for (const row of users) {
    const userOk = safeEqual(user, row.user);
    const passOk = safeEqual(password, row.password);
    if (userOk && passOk) ok = true;
  }
  return ok;
}

export function unauthorizedResponse(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Checking sites", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}
