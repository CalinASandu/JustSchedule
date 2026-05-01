"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";

const links = ["Features", "Schools", "Pricing"];

export function Navbar({ redirectPath = "/dashboard" }: { redirectPath?: string }) {
  const { scrollY } = useScroll();
  const bg = useTransform(
    scrollY,
    [0, 60],
    ["rgba(8,11,16,0)", "rgba(8,11,16,0.9)"],
  );
  const borderOpacity = useTransform(scrollY, [0, 60], [0, 1]);

  return (
    <motion.header
      style={{ background: bg }}
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-md"
    >
      <motion.div
        style={{ opacity: borderOpacity }}
        className="absolute inset-x-0 bottom-0 h-px bg-white/6"
      />

      <nav className="max-w-[1400px] mx-auto flex items-center justify-between px-6 lg:px-10 h-[62px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-[8px]"
            style={{
              width: 30,
              height: 30,
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
            }}
          >
            <CalendarDays
              size={14}
              className="text-indigo-400"
              strokeWidth={2}
            />
          </div>
          <span className="text-white font-semibold text-[15px]">
            JustSchedule
          </span>
        </div>

        {/* Center links */}
        <ul className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <li key={l}>
              <button className="px-3.5 py-1.5 text-sm text-white/50 hover:text-white/90 transition-colors rounded-md hover:bg-white/[0.04]">
                {l}
              </button>
            </li>
          ))}
        </ul>

        {/* Right CTAs */}
        <div className="flex items-center gap-2">
          <GoogleSignInButton compact redirectPath={redirectPath} />
        </div>
      </nav>
    </motion.header>
  );
}
