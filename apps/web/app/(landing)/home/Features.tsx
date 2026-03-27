import clsx from "clsx";
import {
  BarChart2Icon,
  EyeIcon,
  LineChart,
  type LucideIcon,
  MousePointer2Icon,
  Orbit,
  ShieldHalfIcon,
  Sparkles,
  SparklesIcon,
  TagIcon,
  BellIcon,
  ReplyIcon,
} from "lucide-react";
import Image from "next/image";

type Side = "left" | "right";

export function FeaturesHome() {
  return (
    <>
      <FeaturesAiAssistant />
      <FeaturesReplyZero imageSide="right" />
      <FeaturesUnsubscribe />
      <FeaturesColdEmailBlocker imageSide="right" />
      <FeaturesStats />
    </>
  );
}

export function FeaturesWithImage({
  imageSide = "left",
  title,
  subtitle,
  description,
  image,
  features,
}: {
  imageSide?: "left" | "right";
  title: string;
  subtitle: string;
  description: React.ReactNode;
  image: string;
  features: {
    name: string;
    description: string;
    icon: LucideIcon;
  }[];
}) {
  return (
    <div className="overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <div
            className={clsx(
              "lg:pt-4",
              imageSide === "left"
                ? "lg:ml-auto lg:pl-4"
                : "lg:mr-auto lg:pr-4",
            )}
          >
            <div className="lg:max-w-lg">
              <h2 className="font-cal text-base leading-7 text-blue-600">
                {title}
              </h2>
              <p className="mt-2 font-cal text-3xl text-gray-900 sm:text-4xl">
                {subtitle}
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                {description}
              </p>
              {!!features.length && (
                <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-600 lg:max-w-none">
                  {features.map((feature) => (
                    <div key={feature.name} className="relative pl-9">
                      <dt className="inline font-semibold text-gray-900">
                        <feature.icon
                          className="absolute left-1 top-1 h-5 w-5 text-blue-600"
                          aria-hidden="true"
                        />
                        {feature.name}
                      </dt>{" "}
                      <dd className="inline">{feature.description}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
          <div
            className={clsx(
              "flex items-start",
              imageSide === "left"
                ? "justify-end lg:order-first"
                : "justify-start lg:order-last",
            )}
          >
            <div className="rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl lg:p-4">
              <Image
                src={image}
                alt="Product screenshot"
                className="w-[48rem] max-w-none rounded-xl shadow-2xl ring-1 ring-gray-400/10 sm:w-[57rem]"
                width={2400}
                height={1800}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturesAiAssistant({ imageSide }: { imageSide?: Side }) {
  const title = "Your Personal Assistant";
  const subtitle = "A calm, capable hand on your inbox";
  const description = (
    <>
      Bntly drafts replies, organizes messages, and labels everything — so your
      inbox stays tidy without you lifting a finger.
      <br />
      <br />
      Tell Bntly what you need in plain English. Want newsletters quietly
      archived? Important contacts flagged? Draft replies ready for your morning
      coffee? Just say the word.
      <br />
      <br />
      Once set up, Bntly works around the clock to keep things exactly how you
      like them. No overwhelm. No fuss. I{"'"}ve got this.
    </>
  );

  return (
    <FeaturesWithImage
      imageSide={imageSide}
      title={title}
      subtitle={subtitle}
      description={description}
      features={[]}
      image="/images/home/ai-email-assistant.png"
    />
  );
}

const featuresColdEmailBlocker = [
  {
    name: "Block out the noise",
    description:
      "Cold emails get quietly archived or labeled — your inbox stays focused on messages from people you actually know.",
    icon: ShieldHalfIcon,
  },
  {
    name: "You define what's cold",
    description:
      "Tell Bntly what counts as unwanted outreach for you. It learns your preferences and filters accordingly.",
    icon: SparklesIcon,
  },
  {
    name: "Review later, if ever",
    description:
      "Cold emails are labeled and tucked away. Glance at them when you feel like it, or don't. Your call.",
    icon: TagIcon,
  },
];

export function FeaturesColdEmailBlocker({ imageSide }: { imageSide?: Side }) {
  const subtitle = "Never read a cold email again";
  const description =
    "Sales pitches and unsolicited outreach disappear before they reach you. Bntly keeps your inbox reserved for the people and conversations you care about.";

  return (
    <FeaturesWithImage
      imageSide={imageSide}
      title="Cold Email Blocker"
      subtitle={subtitle}
      description={description}
      image="/images/home/cold-email-blocker.png"
      features={featuresColdEmailBlocker}
    />
  );
}

const featuresStats = [
  {
    name: "Who emails you most",
    description:
      "See which senders fill your inbox and decide what to do about it — unsubscribe, filter, or simply be aware.",
    icon: Sparkles,
  },
  {
    name: "Who you email most",
    description:
      "Spot your most frequent conversations. Maybe there's a better channel, or maybe it's just nice to know.",
    icon: Orbit,
  },
  {
    name: "What type of emails you get",
    description:
      "Newsletters, promotions, cold outreach — see the breakdown and let Bntly help you quiet the noise.",
    icon: LineChart,
  },
];

export function FeaturesStats({ imageSide }: { imageSide?: Side }) {
  return (
    <FeaturesWithImage
      imageSide={imageSide}
      title="Email Analytics"
      subtitle="Know your inbox, own your inbox"
      description="A clear picture of what's landing in your email — who's writing, what's piling up, and where your attention actually goes. Understanding is the first step to calm."
      image="/images/home/email-analytics.png"
      features={featuresStats}
    />
  );
}

const featuresUnsubscribe = [
  {
    name: "One-click unsubscribe",
    description:
      "No more hunting for tiny unsubscribe links. One click and it's done — or let Bntly auto-archive instead.",
    icon: MousePointer2Icon,
  },
  {
    name: "See who fills your inbox",
    description:
      "Bntly shows you which senders are most active so you can decide who stays and who goes.",
    icon: EyeIcon,
  },
  {
    name: "Know what you actually read",
    description:
      "See your open rates by sender. If you never read it, why keep getting it?",
    icon: BarChart2Icon,
  },
];

export function FeaturesUnsubscribe({ imageSide }: { imageSide?: Side }) {
  return (
    <FeaturesWithImage
      imageSide={imageSide}
      title="Bulk Unsubscriber"
      subtitle="Clear out the clutter in minutes"
      description="Newsletters you forgot you signed up for, promotions you never open — Bntly surfaces them all and lets you unsubscribe in bulk. One sitting, a cleaner inbox."
      image="/images/home/bulk-unsubscriber.png"
      features={featuresUnsubscribe}
    />
  );
}

const featuresReplyZero = [
  {
    name: "Pre-drafted replies",
    description:
      "Open your inbox to find thoughtful drafts already waiting. Review, tweak, and send — or let them go as-is.",
    icon: ReplyIcon,
  },
  {
    name: "Focus on what needs a reply",
    description:
      "Bntly labels emails that need your attention so you can skip the noise and reply to what matters.",
    icon: EyeIcon,
  },
  {
    name: "Gentle follow-up reminders",
    description:
      "Conversations don't slip through the cracks. Bntly flags emails awaiting replies and surfaces overdue ones.",
    icon: BellIcon,
  },
  {
    name: "One-click follow-ups",
    description:
      "Need to nudge someone? Bntly drafts a polite follow-up so you can send it with a single click.",
    icon: SparklesIcon,
  },
];

export function FeaturesReplyZero({ imageSide }: { imageSide?: Side }) {
  return (
    <FeaturesWithImage
      imageSide={imageSide}
      title="Reply Zero"
      subtitle="Drafts ready when you are"
      description="Bntly identifies the emails that need your voice and prepares thoughtful draft replies. You just review and send. Less time writing, more time living."
      image="/images/home/reply-zero.png"
      features={featuresReplyZero}
    />
  );
}
