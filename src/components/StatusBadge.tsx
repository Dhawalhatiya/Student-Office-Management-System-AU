import { getStatusDisplay, type BadgeTone } from '../utils/format';

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-[#eef6f0] text-[#185a39] border-[#c4decb]',
  amber: 'bg-[#fdf7e8] text-[#8a6111] border-[#ead69e]',
  red: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
  blue: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
  grey: 'bg-[#f1f5f2] text-[#49574f] border-[#dbe4de]',
};

export function StatusBadge({ status }: { status: string }) {
  const { label, tone } = getStatusDisplay(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
