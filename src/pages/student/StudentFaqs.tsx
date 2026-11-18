import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const FAQ_ITEMS = [
  {
    id: 'faq-profile',
    question: 'How do I update protected details such as my name, date of birth, or programme?',
    answer:
      'Academic and identity fields on My Profile are locked to protect official university records. To request a change, submit a Profile correction request under My Requests and attach supporting proof if applicable.',
  },
  {
    id: 'faq-fees',
    question: 'Why did my recent UPI or NEFT payment not reduce my fee balance yet?',
    answer:
      'Fee status and remaining balance are derived exclusively from payments marked Verified by the Finance office. Payments in Pending status are awaiting bank reconciliation and do not reduce your payable balance until verified.',
  },
  {
    id: 'faq-results',
    question: 'When do semester examination results appear in my portal?',
    answer:
      'Only results with status Published are visible to students. Results currently in Draft, Under review, or Approved moderation stages remain hidden until the Examination office publishes the semester batch.',
  },
  {
    id: 'faq-documents',
    question: 'What should I do if a document is marked Rejected or Replacement required?',
    answer:
      'Check the reviewer note attached to the document (for example, unclear scan or expired certificate) and submit a fresh legible file in My Documents.',
  },
  {
    id: 'faq-requests',
    question: 'What do the different administrative request statuses mean?',
    answer:
      'Submitted means your ticket has been logged; Under review means an office staff member is actively processing it; Waiting for student means a reply or supporting file from you is needed; Resolved and Closed indicate completion.',
  },
];

export function StudentFaqs() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-b border-[#dbe4de] pb-4">
        <h1 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
          Help and FAQs
        </h1>
        <p className="mt-1 text-sm text-[#5a6a61]">
          Common questions about enrollment records, fee verification, examination results, and student requests.
        </p>
      </div>

      <section className="divide-y divide-[#dbe4de] rounded-xl border border-[#dbe4de] bg-white">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          const panelId = `${item.id}-panel`;
          return (
            <div key={item.id}>
              <h2>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-semibold text-[#17221c] hover:bg-[#f8faf7] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#185a39]"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#5a6a61] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </h2>
              {isOpen && (
                <div
                  id={panelId}
                  className="border-t border-[#dbe4de]/60 bg-[#f8faf7] px-6 py-4 text-sm leading-relaxed text-[#5a6a61]"
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dbe4de] bg-[#eef6f0] p-5">
        <p className="text-sm text-[#17221c]">
          Need assistance with a specific record or certificate?
        </p>
        <Link
          to="/student/requests"
          className="rounded-lg bg-[#185a39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e3623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
        >
          Go to My Requests
        </Link>
      </div>
    </div>
  );
}
