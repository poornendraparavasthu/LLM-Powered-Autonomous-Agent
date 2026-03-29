import { discoverBackendBase } from "./runtime";

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function apiFetch(path, options = {}) {
  const apiBase = await discoverBackendBase();
  
  if (!apiBase) {
    throw new Error("Backend server not found. Is the backend running on http://127.0.0.1:3000?" );
  }

  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const data = await parseJson(response);

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Network error: Cannot reach backend server. Check your connection and backend status.");
    }
    throw error;
  }
}
