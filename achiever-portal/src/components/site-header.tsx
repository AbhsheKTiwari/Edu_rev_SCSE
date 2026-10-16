"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { href: "/#achievers", label: "Achievers" },
  { href: "/achievers", label: "Archive" },
  { href: "/#categories", label: "Categories" },
  { href: "/#research", label: "Research" },
  { href: "/#placements", label: "Placements" },
];

export function SiteHeader({ portalName, logoUrl }: { portalName: string; logoUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="wrap site-header-inner">
        <Link href="/" className="brand-link" aria-label={`${portalName} home`}>
          {logoUrl ? (
            <Image src={logoUrl} alt="University logo" width={150} height={52} unoptimized style={{ height: 52, width: "auto" }} />
          ) : (
            <span className="brand-logo-slot" aria-hidden="true">
              University logo
              <br />
              (approved file)
            </span>
          )}
          <span className="brand-divider" aria-hidden="true" />
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="brand-name">{portalName}</span>
            <span className="brand-sub">Student Recognition Portal</span>
          </span>
        </Link>

        <nav aria-label="Main" className="nav-links">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="nav-cta">
          <Link className="btn btn-ghost" href="/faculty/login">
            Faculty Login
          </Link>
          <Link className="btn btn-primary" href="/student/login">
            Student Login
          </Link>
        </div>

        <button
          className="icon-btn menu-btn"
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="mobile-menu">
          <nav aria-label="Mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="mm-link" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Link className="btn btn-ghost" href="/faculty/login" style={{ flex: 1 }}>
              Faculty Login
            </Link>
            <Link className="btn btn-primary" href="/student/login" style={{ flex: 1 }}>
              Student Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
