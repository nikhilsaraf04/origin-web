// Mirrors Origin/Components/OriginTabBar.swift — three nav targets + center scan FAB.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";

const tabs = [
  { label: "Library", href: "/" },
  { label: "Palette", href: "/palette" },
] as const;

export function OriginTabBar() {
  const pathname = usePathname() || "/";
  // Hide tab bar on the scan screen so the camera-like UI fills the viewport.
  if (pathname.startsWith("/scan") || pathname.startsWith("/review")) return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line-2"
      style={{
        height: 88,
        background: "rgba(10,15,24,0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-3xl mx-auto h-full px-s5 flex items-center justify-between">
        {tabs.slice(0, 1).map((tab) => (
          <TabButton key={tab.href} {...tab} active={pathname === tab.href} />
        ))}

        <Link
          href="/scan"
          className="-mt-6 w-[62px] h-[62px] rounded-pill bg-accent text-accent-ink flex items-center justify-center shadow-lg"
          aria-label="Scan a bag"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 12h10" />
          </svg>
        </Link>

        {tabs.slice(1).map((tab) => (
          <TabButton key={tab.href} {...tab} active={pathname === tab.href} />
        ))}
      </div>
    </nav>
  );
}

function TabButton({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "uppercase font-ui font-medium text-[10px] tracking-[0.1em] px-s4 py-s2",
        active ? "text-ink-1" : "text-ink-3",
      )}
    >
      {label}
    </Link>
  );
}
