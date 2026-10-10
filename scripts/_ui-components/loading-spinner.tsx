export function PageLoadingSpinner() {
  return (
    <div role="status" className="flex h-[60vh] items-center justify-center">
      <div
        aria-hidden="true"
        className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
      />
      <span className="sr-only">読み込んでいます</span>
    </div>
  );
}
