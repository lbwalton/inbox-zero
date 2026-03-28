import { CTAButtons } from "@/app/(landing)/home/CTAButtons";
import { SquaresPattern } from "@/app/(landing)/home/SquaresPattern";
import { cn } from "@/utils";
import { LogoCloud } from "@/app/(landing)/home/LogoCloud";
import { env } from "@/env";
import { HeroAB } from "@/app/(landing)/home/HeroAB";
import HeroVideoDialog from "@/components/HeroVideoDialog";

export function HeroText(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const { className, ...rest } = props;

  return (
    <h1
      className={cn("font-cal text-4xl text-gray-900 sm:text-6xl", className)}
      {...rest}
    />
  );
}

export function HeroSubtitle(props: { children: React.ReactNode }) {
  return <p className="mt-6 text-lg leading-8 text-gray-600" {...props} />;
}

export function HeroHome() {
  if (env.NEXT_PUBLIC_POSTHOG_HERO_AB) return <HeroAB />;
  return <Hero />;
}

export function Hero(props: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  image?: string;
  CTAComponent?: React.ComponentType;
  video?: React.ReactNode;
}) {
  const CTAComponent = props.CTAComponent || CTAButtons;

  return (
    <div className="relative pt-14">
      <SquaresPattern />
      <div className="pt-24 sm:pb-12 sm:pt-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <HeroText>{props.title || "Your Inbox, Handled."}</HeroText>
            <HeroSubtitle>
              {props.subtitle ||
                "Bntly is your personal email assistant that quietly takes care of the busywork — smart replies, a tidy inbox, and fewer distractions so you can focus on what matters."}
            </HeroSubtitle>
            <CTAComponent />
          </div>

          <LogoCloud />

          <div className="relative mt-16 flow-root sm:mt-24">
            {props.video || (
              <HeroVideoDialog
                className="block"
                animationStyle="top-in-bottom-out"
                videoSrc="https://www.youtube.com/embed/hfvKvTHBjG0?autoplay=1&rel=0"
                thumbnailSrc={
                  props.image || "/images/home/bulk-unsubscriber.png"
                }
                thumbnailAlt="Bntly email assistant in action"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
