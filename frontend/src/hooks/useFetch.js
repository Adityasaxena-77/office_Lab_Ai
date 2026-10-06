import { useEffect, useState } from "react";
import { apiGet } from "../api";

/** Fetches on mount and whenever path/params change; cancels stale requests. */
export function useFetch(path, params = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const key = path ? path + JSON.stringify(params) : null;

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    apiGet(path, params, ctrl.signal)
      .then((body) => setState({ data: body.data, meta: body.meta, loading: false, error: null }))
      .catch((e) => e.name !== "AbortError" && setState({ data: null, meta: null, loading: false, error: e.message }));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
