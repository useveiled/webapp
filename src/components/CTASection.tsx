import Link from "next/link";
import Image from "next/image";
import { publicImage } from "@/lib/public-image";
import { TiltCard } from "@/components/landing/TiltCard";

export function CTASection() {
  const bg = publicImage("bg-cta.jpg");
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <div className="glass border-gradient relative isolate overflow-hidden rounded-[24px] px-6 py-14 sm:px-12 sm:py-16">
          {bg && (
            <div aria-hidden="true" className="absolute inset-0 -z-10">
              <Image src={bg} alt="" fill quality={90} sizes="(min-width: 1200px) 1200px, 100vw" className="object-cover opacity-60" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,11,0.85)_0%,rgba(5,7,11,0.55)_50%,rgba(5,7,11,0.15)_100%)]" />
            </div>
          )}
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="t-h2">Open an account in a few minutes. Keep it private for good.</h2>
              <p className="t-body mt-4 max-w-[520px]">
                Non-custodial from the first deposit. Veiled is in beta on Solana.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Open an account
                </Link>
                <a href="https://docs.useveiled.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
                  Read the docs
                </a>
              </div>
            </div>
            <div className="lg:col-span-5">
              <TiltCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
