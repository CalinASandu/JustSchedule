"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onClick?: () => void;
  compact?: boolean;
}

export function GoogleSignInButton({ onClick, compact = false }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (onClick) {
      onClick();
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        console.error("Google sign-in failed", error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Google sign-in failed", error);
      setIsLoading(false);
    }
  }

  if (compact) {
    return (
      <motion.button
        onClick={handleClick}
        disabled={isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex items-center gap-2 bg-white text-gray-800 rounded-lg px-3.5 py-1.5 text-sm font-semibold cursor-pointer disabled:pointer-events-none disabled:opacity-70"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
      >
        <GoogleIcon size={14} />
        {isLoading ? "Signing in" : "Get started"}
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-center justify-center gap-3 bg-white text-gray-800 rounded-xl px-5 py-3 text-sm font-semibold cursor-pointer disabled:pointer-events-none disabled:opacity-70"
      style={{
        boxShadow: "0 2px 10px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.2)",
      }}
    >
      <GoogleIcon size={16} />
      {isLoading ? "Signing in" : "Continue with Google"}
    </motion.button>
  );
}

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg className="shrink-0" width={size} height={size} viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
