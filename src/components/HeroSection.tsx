import Link from "next/link";
import { AppDemo } from "@/components/demo/AppDemo";
import { SectionImage } from "@/components/landing/SectionImage";
import { publicImage } from "@/lib/public-image";

export function HeroSection() {
  return (
    <section className="relative isolate">
      <SectionImage src={publicImage("bg-hero.jpg")} fade="bottom" opacity={0.7} position="center top" priority className="bottom-auto h-[980px]" />
      <div className="mx-auto max-w-[1200px] px-4 pt-[128px] sm:px-8 sm:pt-[152px]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h1 className="t-display veil-in">
              Your money is
              <br />
              nobody&apos;s business.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-2">
            <p className="t-lead veil-in [animation-delay:60ms]">
              Private banking on Solana for you and your AI agents. Amounts stay encrypted end to end,
              agents spend only inside limits the chain enforces, and you keep your own keys.

              CA: EHjAE3NxqMbQnjNZM1eXBVPTP9NXZJ5YTvjBodQ9pump
            </p>
            <div className="veil-in mt-7 flex flex-wrap gap-3 [animation-delay:120ms]">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Open an account
              </Link>
              <a href="https://docs.useveiled.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
                Read the docs
              </a>
            </div>
          </div>
        </div>

        <div className="veil-in mt-14 [animation-delay:180ms] sm:mt-16">
          <AppDemo />
          <p className="mt-3 text-center text-[12.5px] text-fg-faint">The Veiled app, playing a sample account. Names and amounts are illustrative.</p>
        </div>
      </div>
    </section>
  );
}
