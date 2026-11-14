// Small messages for the in-between moments: loading, error, nothing here.
export function Loading() {
  return <div className="status" role="status">Loading…</div>;
}

export function Failed({ message, onRetry }) {
  return (
    <div className="status" role="alert">
      <h2>That did not work</h2>
      <p>{message}</p>
      {onRetry && <p style={{ marginTop: 12 }}><button className="btn" type="button" onClick={onRetry}>Try again</button></p>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="status">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

// The heading at the top of every screen.
export function PageHead({ title, children }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}
