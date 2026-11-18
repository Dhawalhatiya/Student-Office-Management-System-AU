import { Link } from 'react-router-dom';

interface PlannedPhasePanelProps {
  title: string;
  phaseNumber: number;
  description: string;
  plannedItems: string[];
  backTo: string;
  backLabel: string;
}

export function PlannedPhasePanel({
  title,
  phaseNumber,
  description,
  plannedItems,
  backTo,
  backLabel,
}: PlannedPhasePanelProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-b border-[#dbe4de] pb-4">
        <h1 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[#5a6a61]">{description}</p>
      </div>

      <section className="rounded-xl border border-[#dbe4de] bg-white p-6 sm:p-8">
        <div className="rounded-lg border border-[#ead69e] bg-[#fdf7e8] px-4 py-3 text-sm font-medium text-[#7a540b]">
          Planned for Phase {phaseNumber}. This section is not built yet.
        </div>

        <h2 className="font-heading mt-6 text-lg font-semibold text-[#17221c]">
          What this section will contain
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm text-[#17221c]">
          {plannedItems.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#185a39]"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[#dbe4de] pt-5">
          <Link
            to={backTo}
            className="inline-flex items-center rounded-lg bg-[#185a39] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0e3623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
          >
            {backLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}
