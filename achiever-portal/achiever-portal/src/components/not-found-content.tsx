import Link from "next/link";

export function NotFoundContent() {
  return (
    <div className="auth-card" style={{ textAlign: "center", alignItems: "center" }}>
      <span className="eyebrow">Error 404</span>
      <h1 style={{ margin: 0, fontSize: 28 }}>Page not found</h1>
      <p className="muted" style={{ margin: 0 }}>
        The page you are looking for does not exist or may have moved.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Link className="btn btn-primary" href="/">
          Go to homepage
        </Link>
        <Link className="btn btn-ghost" href="/achievers">
          Browse achievements
        </Link>
      </div>
    </div>
  );
}
