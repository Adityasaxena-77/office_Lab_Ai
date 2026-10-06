const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/** GET helper: builds the query string, unwraps the {status,data,meta} envelope, throws readable errors. */
export async function apiGet(path, params = {}, signal) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  let res;
  try {
    res = await fetch(`${BASE}${path}?${qs}`, { signal });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new Error("Cannot reach the API. Is the backend running on " + BASE + "?");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.status === "error") throw new Error(body?.message || `Request failed (${res.status})`);
  return body;
}

export const formatMoney = (value, currency) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value ?? 0);
