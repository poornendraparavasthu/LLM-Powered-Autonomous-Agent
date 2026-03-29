const API_OVERRIDE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || null;
const SOCKET_OVERRIDE = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, "") || null;

let backendBasePromise = null;

function getCandidateBases() {
  const candidates = new Set();
  const browserHost =
    typeof window !== "undefined" ? window.location.hostname : null;
  const hosts = [browserHost, "127.0.0.1", "localhost"].filter(Boolean);

  for (const host of hosts) {
    for (let port = 3000; port <= 3005; port += 1) {
      candidates.add(`http://${host}:${port}`);
    }
  }

  return [...candidates];
}

async function fetchHealth(base) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`${base}/health`, {
      signal: controller.signal
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json().catch(() => null);
    return data?.status === "ok";
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function discoverBackendBase() {
  if (API_OVERRIDE) {
    return API_OVERRIDE;
  }

  if (!backendBasePromise) {
    backendBasePromise = (async () => {
      for (const base of getCandidateBases()) {
        if (await fetchHealth(base)) {
          return base;
        }
      }

      return "http://127.0.0.1:3000";
    })();
  }

  return backendBasePromise;
}

export async function discoverSocketBase() {
  if (SOCKET_OVERRIDE) {
    return SOCKET_OVERRIDE;
  }

  return discoverBackendBase();
}

export function resetBackendDiscovery() {
  backendBasePromise = null;
}
