"use client";

import clsx from "clsx";
import Script from "next/script";
import { useTestimonialsVariant } from "@/hooks/useFeatureFlags";

type Testimonial = {
  body: string;
  author: {
    name: string;
    handle: string;
  };
};

const featuredTestimonial = {
  body: "Bntly cleaned up years of inbox clutter in minutes. I finally feel like my email is working for me, not against me. It's like having a quiet, thoughtful assistant who just gets it.",
  author: {
    name: "Sarah M.",
    handle: "personal user",
  },
};

const testimonialA: Testimonial = {
  body: "I used to dread opening my inbox. Now Bntly handles the noise and I only see what actually matters. It's genuinely changed my mornings.",
  author: {
    name: "David R.",
    handle: "personal user",
  },
};

const testimonialB: Testimonial = {
  body: "The AI drafts are surprisingly good — they sound like me. I just review, tweak if needed, and send. Saves me at least an hour a day.",
  author: {
    name: "Priya K.",
    handle: "personal user",
  },
};

const testimonialC: Testimonial = {
  body: "I was skeptical about giving an AI access to my email, but Bntly's privacy-first approach won me over. Google-approved and transparent about everything.",
  author: {
    name: "Marcus J.",
    handle: "personal user",
  },
};

const desktopTestimonials: Testimonial[][][] = [
  [
    [
      testimonialA,
      {
        body: "Unsubscribing from junk used to be a weekend project. Bntly made it a five-minute task. My inbox has never been this clean.",
        author: {
          name: "Elena T.",
          handle: "personal user",
        },
      },
      testimonialB,
    ],
    [
      {
        body: "What I love most is the contact intelligence — Bntly knows who I care about and makes sure those emails never get lost in the shuffle.",
        author: {
          name: "James L.",
          handle: "personal user",
        },
      },
    ],
  ],
  [
    [
      {
        body: "I've tried every inbox tool out there. Bntly is the first one that actually sticks because it doesn't try to change how I work — it just makes everything smoother.",
        author: {
          name: "Amara W.",
          handle: "personal user",
        },
      },
      {
        body: "The cold email blocker alone is worth it. No more wading through sales pitches to find real messages from real people.",
        author: {
          name: "Chris P.",
          handle: "personal user",
        },
      },
    ],
    [
      testimonialC,
      {
        body: "Bntly feels like it was made for people who want their email handled, not people who want another app to manage. Calm, simple, effective.",
        author: {
          name: "Nadia S.",
          handle: "personal user",
        },
      },
    ],
  ],
];

const mobileTestimonials: Testimonial[] = [
  testimonialB,
  testimonialA,
  testimonialC,
];

export function Testimonials() {
  const variant = useTestimonialsVariant();

  return (
    <div className="relative isolate bg-white pb-20 pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold leading-8 tracking-tight text-blue-600">
            People Love Bntly
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Your inbox, finally at peace
          </p>
        </div>

        {variant === "senja-widget" ? (
          <SenjaWidgetContent />
        ) : (
          <TestimonialsContent />
        )}
      </div>
    </div>
  );
}

function TestimonialsContent() {
  return (
    <>
      {/* Mobile */}
      <div className="mx-auto mt-16 grid max-w-2xl gap-4 text-sm leading-6 text-gray-900 sm:hidden">
        {mobileTestimonials.map((testimonial) => (
          <figure
            key={testimonial.author.name}
            className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5"
          >
            <blockquote className="text-gray-900">
              <p>{`"${testimonial.body}"`}</p>
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                {testimonial.author.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold">{testimonial.author.name}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Desktop */}
      <div className="mx-auto mt-16 hidden max-w-2xl grid-cols-1 grid-rows-1 gap-8 text-sm leading-6 text-gray-900 sm:mt-20 sm:grid sm:grid-cols-2 xl:mx-0 xl:max-w-none xl:grid-flow-col xl:grid-cols-4">
        <figure className="rounded-2xl bg-white shadow-lg ring-1 ring-gray-900/5 sm:col-span-2 xl:col-start-2 xl:row-end-1">
          <blockquote className="p-6 text-lg font-semibold leading-7 tracking-tight text-gray-900 sm:p-12 sm:text-xl sm:leading-8">
            <p>{`"${featuredTestimonial.body}"`}</p>
          </blockquote>
          <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-4 border-t border-gray-900/10 px-6 py-4 sm:flex-nowrap">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
              {featuredTestimonial.author.name.charAt(0)}
            </div>
            <div className="flex-auto">
              <div className="font-semibold">
                {featuredTestimonial.author.name}
              </div>
              <div className="text-gray-600">Bntly user</div>
            </div>
          </figcaption>
        </figure>

        {desktopTestimonials.map((columnGroup, columnGroupIdx) => (
          <div
            key={columnGroupIdx}
            className="space-y-8 xl:contents xl:space-y-0"
          >
            {columnGroup.map((column, columnIdx) => (
              <div
                key={columnIdx}
                className={clsx(
                  (columnGroupIdx === 0 && columnIdx === 0) ||
                    (columnGroupIdx === desktopTestimonials.length - 1 &&
                      columnIdx === columnGroup.length - 1)
                    ? "xl:row-span-2"
                    : "xl:row-start-1",
                  "space-y-8",
                )}
              >
                {column.map((testimonial) => (
                  <figure
                    key={testimonial.author.name}
                    className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5"
                  >
                    <blockquote className="text-gray-900">
                      <p>{`"${testimonial.body}"`}</p>
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                        {testimonial.author.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold">
                          {testimonial.author.name}
                        </div>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function SenjaWidgetContent() {
  return (
    <div className="mt-16">
      <Script
        src="https://widget.senja.io/widget/321e14fc-aa08-41f8-8dfd-ed3cd75d1308/platform.js"
        strategy="lazyOnload"
      />
      <div
        className="senja-embed"
        data-id="321e14fc-aa08-41f8-8dfd-ed3cd75d1308"
        data-mode="shadow"
        data-lazyload="false"
        style={{ display: "block", width: "100%" }}
      />
    </div>
  );
}
