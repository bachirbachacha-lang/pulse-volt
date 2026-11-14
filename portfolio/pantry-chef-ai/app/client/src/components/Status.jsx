// Small messages for the moments when there is no content to show.
export function Loading() {
  return <p className="empty" role="status">Loading…</p>;
}

export function ErrorNote({ message, onRetry }) {
  return (
    <div className="error stack" role="alert">
      <p>{message}</p>
      {onRetry && <button className="btn ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
