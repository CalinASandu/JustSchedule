import WhatsNewModal from "@/components/release/WhatsNewModal";

/**
 * Single mount point for release notes across every authenticated dashboard
 * route. Each route below still builds its own shell; this layout adds no data
 * fetching, so it does not delay them or their loading skeletons.
 *
 * Scope is intentional: the landing page, /login, and /invite/[token] are not
 * covered, because a release dialog must not interrupt signing in or accepting
 * an invite.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <WhatsNewModal />
    </>
  );
}
