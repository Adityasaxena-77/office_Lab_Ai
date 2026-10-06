export function Loading({ label = "Loading…" }) {
  return <div className="state"><span className="spinner" /> {label}</div>;
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="state error" role="alert">
      <strong>Something went wrong.</strong> <span>{message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  );
}

/** Renders loading / error / empty / content for any fetch result. */
export function Async({ result, empty, children }) {
  if (result.loading) return <Loading />;
  if (result.error) return <ErrorBox message={result.error} onRetry={result.retry} />;
  if (empty?.(result.data)) return <div className="state muted">No data for the selected filters.</div>;
  return children(result.data, result.meta);
}
