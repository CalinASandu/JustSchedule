"use client";

import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck2,
  Clock3,
  GraduationCap,
  MapPin,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "./Navbar";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { HeroVisual } from "./HeroVisual";

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.12 + i * 0.1,
      duration: 0.62,
      ease: "easeOut",
    },
  }),
};

const floatingMarks = [
  { icon: CalendarCheck2, className: "left-[8%] top-[23%]", delay: "0s" },
  { icon: Clock3, className: "right-[44%] top-[19%]", delay: "1.4s" },
  { icon: GraduationCap, className: "left-[14%] bottom-[25%]", delay: "2.1s" },
  { icon: MapPin, className: "right-[7%] bottom-[31%]", delay: "0.8s" },
  { icon: ShieldCheck, className: "left-[43%] top-[14%]", delay: "2.8s" },
  { icon: UsersRound, className: "right-[35%] bottom-[15%]", delay: "1.9s" },
];

export function HeroSection() {
  return (
    <>
      <Navbar />

      <main className="relative min-h-dvh flex flex-col overflow-hidden bg-[#080b10] text-white">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(115deg, #080b10 0%, #0b1118 46%, #101923 100%)",
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none opacity-55"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.027) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.027) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 18%, black 78%, transparent 100%)",
          }}
        />

        <div className="absolute inset-0 pointer-events-none hidden sm:block">
          {floatingMarks.map(({ icon: Icon, className, delay }, index) => (
            <div
              key={index}
              className={`icon-drift absolute flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.055] bg-white/[0.025] text-white/22 backdrop-blur-sm ${className}`}
              style={{ animationDelay: delay }}
            >
              <Icon size={15} strokeWidth={1.6} />
            </div>
          ))}
        </div>

        <section className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center gap-10 px-5 pb-16 pt-[92px] sm:px-6 lg:flex-row lg:gap-8 lg:px-10 lg:pb-20 lg:pt-[130px]">
          <div className="flex w-full max-w-[560px] shrink-0 flex-col items-center text-center lg:w-[45%] lg:items-start lg:text-left">
            <motion.div
              custom={0}
              variants={item}
              initial="hidden"
              animate="visible"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200/12 bg-cyan-50/[0.045] px-3.5 py-1.5 text-[12px] font-semibold text-cyan-100/70 backdrop-blur-md lg:mb-8">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.6)]" />
                Live seat maps for schools
              </div>
            </motion.div>

            <motion.h1
              custom={1}
              variants={item}
              initial="hidden"
              animate="visible"
              className="max-w-[560px] text-[clamp(2.35rem,11vw,3.25rem)] font-semibold leading-[1.04] text-white sm:text-[3.7rem] lg:max-w-[620px] lg:text-[4.4rem]"
            >
              Exam scheduling, simplified.
            </motion.h1>

            <motion.p
              custom={2}
              variants={item}
              initial="hidden"
              animate="visible"
              className="mt-5 max-w-[430px] text-[0.98rem] font-medium leading-7 text-slate-300/76 sm:mt-7 sm:leading-8 lg:max-w-[460px]"
            >
              JustSchedule keeps rooms, seats, and student bookings clear in one
              calm workflow.
            </motion.p>

            <motion.div
              custom={3}
              variants={item}
              initial="hidden"
              animate="visible"
              className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center lg:mt-10"
            >
              <GoogleSignInButton />
              <Button
                variant="ghost"
                className="h-11 justify-center gap-2 px-1 text-sm font-semibold text-white/46 hover:bg-transparent hover:text-white/72 sm:justify-start sm:px-3"
              >
                View scheduling flow
                <ArrowRight size={15} />
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.36, duration: 0.9, ease: "easeOut" }}
            className="flex w-full min-w-0 flex-1 justify-center pb-8 lg:justify-end"
          >
            <div className="w-full max-w-[620px] lg:max-w-[660px]">
              <HeroVisual />
            </div>
          </motion.div>
        </section>

        <div
          className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, #080b10)",
          }}
        />
      </main>
    </>
  );
}
