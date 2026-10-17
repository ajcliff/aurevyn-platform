import MarketingShell from "@/components/marketing/MarketingShell";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import ScrollProgress from "@/components/marketing/ScrollProgress";
import AnnouncementBanner from "@/components/marketing/AnnouncementBanner";
import HomeHero from "@/components/marketing/HomeHero";
import HomeEngines from "@/components/marketing/HomeEngines";
import HomeControl from "@/components/marketing/HomeControl";
import HomeSteps from "@/components/marketing/HomeSteps";
import IndustriesSection from "@/components/marketing/IndustriesSection";
import PricingPreview from "@/components/marketing/PricingPreview";
import CtaBand from "@/components/marketing/CtaBand";
import RevealOnScroll from "@/components/marketing/RevealOnScroll";

export default function LandingPage() {
  return (
    <MarketingShell>
      <ScrollProgress />
      <MarketingNav />
      <AnnouncementBanner />
      <HomeHero />
      <RevealOnScroll><HomeEngines /></RevealOnScroll>
      <RevealOnScroll><HomeControl /></RevealOnScroll>
      <RevealOnScroll><IndustriesSection /></RevealOnScroll>
      <RevealOnScroll><HomeSteps /></RevealOnScroll>
      <RevealOnScroll><PricingPreview /></RevealOnScroll>
      <RevealOnScroll><CtaBand /></RevealOnScroll>
      <MarketingFooter />
    </MarketingShell>
  );
}
