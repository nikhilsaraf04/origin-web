// Mirrors Origin/Components/OriginTabBar.swift.
// Option A (approved): even tabs across the bar; the scan button floats
// bottom-right above the bar instead of owning the centre slot.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";

const tabs = [
  { label: "Library", href: "/" },
  { label: "Places", href: "/places" },
  { label: "Best 100", href: "/best100" },
  { label: "Roasters", href: "/roasters" },
  { label: "Palette", href: "/palette" },
] as const;

export function OriginTabBar() {
  const pathname = usePathname() || "/";
  // Hide tab bar on the scan screen so the camera-like UI fills the viewport.
  if (
    pathname.startsWith("/scan") ||
    pathname.startsWith("/review") ||
    pathname.startsWith("/places/new") ||
    pathname.startsWith("/places/edit")
  )
    return null;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line-2"
        style={{
          height: 88,
          background: "rgba(10,15,24,0.94)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-3xl mx-auto h-full px-s5 flex items-stretch">
          {tabs.map((tab) => (
            <TabButton key={tab.href} {...tab} active={isActive(tab.href)} />
          ))}
        </div>
      </nav>

      <Link
        href="/scan"
        className="fixed z-40 w-[50px] h-[50px] rounded-pill bg-accent text-accent-ink flex items-center justify-center"
        style={{ right: 18, bottom: 102, boxShadow: "0 6px 20px rgba(0,0,0,0.45)" }}
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
    </>
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
        "flex-1 min-w-0 flex items-center justify-center uppercase font-ui font-medium text-[10px] px-s1 whitespace-nowrap",
        active ? "text-ink-1" : "text-ink-3",
      )}
      style={{ letterSpacing: "0.08em" }}
    >
      {label}
    </Link>
  );
}
