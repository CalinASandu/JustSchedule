export function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      className="anim-fade-in mb-4 text-[0.8125rem]"
      style={{
        color: "var(--danger)",
        background: "var(--danger-subtle)",
        border: "1px solid var(--danger-border)",
        borderRadius: 8,
        padding: "0.5rem 0.75rem",
      }}
    >
      {message}
    </p>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--accent-border)] p-4">
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}
