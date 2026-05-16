export function PageLoadingSpinner() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
