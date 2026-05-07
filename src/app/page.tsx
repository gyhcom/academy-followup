import { FaqSection } from "@/components/landing/faq-section";
import { FeatureTabsSection, ProductSection } from "@/components/landing/product-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { OnboardingSection } from "@/components/landing/onboarding-section";
import { OutcomesSection } from "@/components/landing/outcomes-section";
import { PilotProofSection } from "@/components/landing/pilot-proof-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { RoleSection } from "@/components/landing/role-section";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#202557]">
      <LandingHeader />
      <HeroSection />
      <RoleSection />
      <ProductSection />
      <OutcomesSection />
      <FeatureTabsSection />
      <OnboardingSection />
      <PilotProofSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <LandingFooter />
    </main>
  );
}
