const faqs = [
  {
    question: "How does Bntly help with my personal email?",
    answer:
      "Bntly is your personal email assistant — it drafts replies, organizes your inbox, and quietly handles the clutter so you can focus on the messages that actually matter. Think of it as a calm, capable helper who's always one step ahead.",
  },
  {
    question: "Is my email data private and secure?",
    answer:
      "Absolutely. Bntly has been approved by Google through a thorough security review. Your data is never used to train AI models, and we're CASA Tier 2 certified. Your privacy isn't an afterthought — it's foundational to how we built this.",
  },
  {
    question: "How does the AI drafting work?",
    answer:
      "Bntly reads incoming emails and prepares draft replies right inside your inbox. You can send them as-is, tweak them, or skip them entirely. The more you use Bntly, the better it understands your tone and preferences.",
  },
  {
    question: "What is contact intelligence?",
    answer:
      "Bntly learns who matters most to you. It tracks who emails you frequently, which messages you actually open, and which senders you tend to reply to — so it can prioritize the right conversations and quiet the rest.",
  },
  {
    question: "Can I still use Bntly alongside my current email client?",
    answer:
      "Yes! Bntly works alongside Gmail and Google Workspace. It's a layer of intelligence on top of your existing inbox — nothing changes about how you send or receive email.",
  },
  {
    question: "Which email providers does Bntly support?",
    answer:
      "We currently support Gmail and Google Workspace accounts. Outlook support is on the way.",
  },
  {
    question: "Do you offer refunds?",
    answer: (
      <>
        Of course. If Bntly isn{"'"}t right for you, just{" "}
        <a
          href="mailto:support@getbntly.com"
          target="_blank"
          className="font-semibold hover:underline"
          rel="noreferrer"
        >
          send us an email
        </a>{" "}
        within 14 days of upgrading and we{"'"}ll take care of it. No questions,
        no hassle.
      </>
    ),
  },
];

export function FAQs() {
  return (
    <div
      className="mx-auto max-w-2xl divide-y divide-gray-900/10 px-6 pb-8 sm:pb-24 sm:pt-12 lg:max-w-7xl lg:px-8 lg:pb-32"
      id="faq"
    >
      <h2 className="font-cal text-2xl leading-10 text-gray-900">
        Frequently asked questions
      </h2>
      <dl className="mt-10 space-y-8 divide-y divide-gray-900/10">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="pt-8 lg:grid lg:grid-cols-12 lg:gap-8"
          >
            <dt className="text-base font-semibold leading-7 text-gray-900 lg:col-span-5">
              {faq.question}
            </dt>
            <dd className="mt-4 lg:col-span-7 lg:mt-0">
              <p className="text-base leading-7 text-gray-600">{faq.answer}</p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
