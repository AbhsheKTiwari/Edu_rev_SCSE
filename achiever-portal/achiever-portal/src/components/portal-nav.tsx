"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

export function PortalNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav style={{ display: "contents" }}>
      {items.map((i) => {
        const active = pathname === i.href || (i.href !== "/" && pathname.startsWith(i.href + "/"));
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
