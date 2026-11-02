import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import {
  PrivacySection,
  AccountsSection,
  AgentPaysSection,
  CapabilitiesSection,
  AudienceSection,
  FaqSection,
} from "@/components/landing/Sections";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <HeroSection />
        <PrivacySection />
        <AccountsSection />
        <AgentPaysSection />
        <CapabilitiesSection />
        <AudienceSection />
        <FaqSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
