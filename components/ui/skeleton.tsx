import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

/**
 * Neutral placeholder block used by route-level `loading.tsx` skeletons.
 * Visual treatment lives in the `.skeleton` utility in `globals.css`.
 */
export default function Skeleton({ className, style }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("skeleton", className)} style={style} />;
}
