export function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      className="anim-fade-in mb-4 text-[0.8125rem]"
      style={{
        color: "#DC2626",
        background: "#FEF2F2",
        border: "1px solid #FECACA",
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
    <div className="rounded-[10px] border border-dashed border-[#C7D2FE] p-4">
      <p className="text-sm font-medium" style={{ color: "#111827" }}>
        {title}
      </p>
      <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
        {description}
      </p>
    </div>
  );
}
