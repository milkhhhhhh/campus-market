export function ErrorState({
  title = "出错了",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <p className="text-base font-semibold text-red-600">{title}</p>
      {description ? (
        <p className="text-sm text-[var(--cm-outline)]">{description}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 min-h-11 rounded-xl bg-[var(--cm-primary-container)] px-4 text-sm font-semibold text-white"
        >
          重试
        </button>
      ) : null}
    </div>
  );
}
