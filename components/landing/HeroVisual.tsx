"use client";

import { motion } from "framer-motion";

const ROW_H = 52; // px per hour
const START_HOUR = 8;
const END_HOUR = 17; // 9 rows shown

type Color = "indigo" | "blue" | "violet" | "emerald" | "amber";

interface Booking {
  dayIdx: number; // 0 = Mon
  startHour: number;
  duration: number; // hours
  label: string;
  room: string;
  color: Color;
  today?: boolean;
}

const bookings: Booking[] = [
  { dayIdx: 0, startHour: 9,    duration: 2,   label: "Mathematics",  room: "Room A-12", color: "indigo" },
  { dayIdx: 1, startHour: 10,   duration: 1.5, label: "Physics",      room: "Lab B-3",   color: "blue", today: true },
  { dayIdx: 2, startHour: 11,   duration: 2,   label: "Chemistry",    room: "Lab C-1",   color: "violet" },
  { dayIdx: 3, startHour: 9,    duration: 1.5, label: "Biology",      room: "Room D-5",  color: "emerald" },
  { dayIdx: 4, startHour: 13.5, duration: 2,   label: "History",      room: "Room A-8",  color: "amber" },
];

const days = [
  { short: "MON", date: 28 },
  { short: "TUE", date: 29, isToday: true },
  { short: "WED", date: 30 },
  { short: "THU", date: 1 },
  { short: "FRI", date: 2 },
];

const colorMap: Record<Color, { accent: string; bg: string; border: string; text: string; dot: string }> = {
  indigo:  { accent: "#6366f1", bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.35)",  text: "#a5b4fc", dot: "#818cf8" },
  blue:    { accent: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.35)",  text: "#93c5fd", dot: "#60a5fa" },
  violet:  { accent: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.35)",  text: "#c4b5fd", dot: "#a78bfa" },
  emerald: { accent: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.35)",  text: "#6ee7b7", dot: "#34d399" },
  amber:   { accent: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)",  text: "#fcd34d", dot: "#fbbf24" },
};

const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export function HeroVisual() {
  const gridH = (END_HOUR - START_HOUR) * ROW_H;

  return (
    <div className="relative w-full max-w-[660px]">
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: "-20% -10%",
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(99,102,241,0.1) 0%, rgba(59,130,246,0.05) 35%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Calendar container */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          perspective: 1400,
          transformStyle: "preserve-3d",
        }}
      >
        <motion.div
          initial={{ rotateX: 8, rotateY: -10, rotateZ: 1 }}
          animate={{ rotateX: 8, rotateY: -10, rotateZ: 1 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="overflow-hidden rounded-xl sm:rounded-2xl"
            style={{
              background: "#0c1120",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)",
            }}
          >
            {/* Top bar */}
            <div
              className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-3.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.055)", background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button className="text-white/30 hover:text-white/60 text-xs" aria-label="Previous week">{"<"}</button>
                <span className="truncate text-[11px] font-medium text-white/75 sm:text-[13px]">
                  Apr 28 - May 2, 2026
                </span>
                <button className="text-white/30 hover:text-white/60 text-xs" aria-label="Next week">{">"}</button>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="whitespace-nowrap rounded-md px-2 py-1 text-[9px] font-medium sm:px-2.5 sm:text-[10px]"
                  style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)" }}
                >
                  Week view
                </span>
              </div>
            </div>

            {/* Day header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "clamp(38px, 11vw, 52px) repeat(5, minmax(0, 1fr))",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div />
              {days.map((d) => (
                <div
                  key={d.short}
                  className="flex flex-col items-center gap-1 py-2.5 sm:py-3"
                  style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: d.isToday ? "#818cf8" : "rgba(148,163,184,0.5)",
                    }}
                  >
                    {d.short}
                  </span>
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: "clamp(23px, 7vw, 28px)",
                      height: "clamp(23px, 7vw, 28px)",
                      background: d.isToday ? "#6366f1" : "transparent",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "clamp(11px, 3.4vw, 14px)",
                        fontWeight: d.isToday ? 700 : 400,
                        color: d.isToday ? "#fff" : "rgba(241,245,249,0.6)",
                      }}
                    >
                      {d.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div style={{ display: "grid", gridTemplateColumns: "clamp(38px, 11vw, 52px) repeat(5, minmax(0, 1fr))" }}>
              {/* Time labels column */}
              <div>
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{
                      height: ROW_H,
                      display: "flex",
                      alignItems: "flex-start",
                      paddingTop: 6,
                      paddingRight: 6,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span style={{ fontSize: 9, color: "rgba(100,116,139,0.5)", fontVariantNumeric: "tabular-nums" }}>
                      {h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((d, dIdx) => {
                const colBookings = bookings.filter((b) => b.dayIdx === dIdx);
                return (
                  <div
                    key={dIdx}
                    className="relative"
                    style={{
                      height: gridH,
                      borderLeft: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    {/* Hour lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0"
                        style={{
                          top: (h - START_HOUR) * ROW_H,
                          height: 1,
                          background: "rgba(255,255,255,0.04)",
                        }}
                      />
                    ))}

                    {/* Bookings */}
                    {colBookings.map((b, bIdx) => {
                      const c = colorMap[b.color];
                      const top = (b.startHour - START_HOUR) * ROW_H + 3;
                      const height = b.duration * ROW_H - 6;
                      return (
                        <motion.div
                          key={bIdx}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.6 + dIdx * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className={`absolute inset-x-0.5 overflow-hidden rounded-md sm:inset-x-1 sm:rounded-lg ${b.today ? "slot-pulse" : ""}`}
                          style={{
                            top,
                            height,
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                            boxShadow: `0 0 14px ${c.bg}`,
                          }}
                        >
                          {/* Left accent bar */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
                            style={{ background: c.accent }}
                          />
                          <div className="pl-2 pr-1 pt-1.5 pb-1 sm:pl-3 sm:pr-1.5">
                            <p style={{ fontSize: "clamp(8px, 2.45vw, 10px)", fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
                              {b.label}
                            </p>
                            <p className="hidden min-[430px]:block" style={{ fontSize: 9, color: "rgba(148,163,184,0.6)", marginTop: 2 }}>
                              {b.room}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating stat pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 sm:px-4"
        style={{
          background: "rgba(12,17,32,0.9)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span
          className="rounded-full"
          style={{ width: 6, height: 6, background: "#34d399", boxShadow: "0 0 6px #34d399", display: "inline-block" }}
        />
        <span style={{ fontSize: 11, color: "rgba(241,245,249,0.7)", fontWeight: 500 }}>
          5 exams scheduled - Week 18
        </span>
      </motion.div>
    </div>
  );
}
