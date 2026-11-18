export function DemoFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer
      className={
        compact
          ? 'border-t border-[#dbe4de] bg-[#f8faf7] px-6 py-4 text-xs text-[#5a6a61]'
          : 'border-t border-[#dbe4de] bg-white px-6 py-6 text-sm text-[#5a6a61]'
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-[#17221c]">Avantika University</span>
          <span aria-hidden="true">·</span>
          <span>Project Design</span>
        </div>
        <p className="text-xs text-[#5a6a61]">
          Demo application - all data is fictional. Access rules run in the browser for demonstration only.
        </p>
      </div>
    </footer>
  );
}
