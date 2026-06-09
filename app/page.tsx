import { redirect } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { getCompletedProfileName, getProfileNameSetupPath } from "@/lib/profile-name";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRelativePath } from "@/lib/urls";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const rawNext = (await searchParams).next;
  const next = sanitizeRelativePath(Array.isArray(rawNext) ? rawNext[0] : rawNext);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("Profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    if (!getCompletedProfileName(profile)) {
      redirect(getProfileNameSetupPath(next));
    }

    redirect(next);
  }

  return <HeroSection redirectPath={next} />;
}
