export function LoadingState({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--cm-surface-high)] border-t-[var(--cm-primary)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--cm-on-surface-variant)]">{label}</p>
    </div>
  );
}
