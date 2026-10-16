"use client";

import Link from "next/link";
import { useEffect } from "react";

// Safe error page: never shows stack traces or database messages to visitors.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="auth-card" style={{ textAlign: "center", alignItems: "center" }}>
      <span className="eyebrow">Something went wrong</span>
      <h1 style={{ margin: 0, fontSize: 26 }}>We couldn’t load this page</h1>
      <p className="muted" style={{ margin: 0 }}>
        Please try again. If the problem continues, contact the portal administrator
        {error.digest ? ` and mention reference ${error.digest}` : ""}.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" type="button" onClick={() => reset()}>
          Try again
        </button>
        <Link className="btn btn-ghost" href="/">
          Homepage
        </Link>
      </div>
    </main>
  );
}
