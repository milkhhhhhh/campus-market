export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <p className="text-base font-semibold text-[var(--cm-on-surface-variant)]">
        {title}
      </p>
      {description ? (
        <p className="text-sm text-[var(--cm-outline)]">{description}</p>
      ) : null}
    </div>
  );
}
