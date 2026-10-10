export function PageSkeleton() {
  return (
    <div role="status" className="flex h-[50vh] items-center justify-center">
      <div className="space-y-4 text-center">
        <div
          aria-hidden="true"
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"
        />
        <span className="sr-only">読み込んでいます</span>
      </div>
    </div>
  );
}
