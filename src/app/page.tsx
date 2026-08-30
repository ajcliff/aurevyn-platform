import MarketingShell from "@/components/marketing/MarketingShell";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import ScrollProgress from "@/components/marketing/ScrollProgress";
import Hero from "@/components/marketing/Hero";
import StatusTicker from "@/components/marketing/StatusTicker";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import EnginesSection from "@/components/marketing/EnginesSection";
import EngineFlowDiagram from "@/components/marketing/EngineFlowDiagram";
import IndustriesSection from "@/components/marketing/IndustriesSection";
import AskAurevynDemo from "@/components/marketing/AskAurevynDemo";
import ComparisonSection from "@/components/marketing/ComparisonSection";
import ProofSection from "@/components/marketing/ProofSection";
import StorefrontBuilderDemo from "@/components/marketing/StorefrontBuilderDemo";
import PricingPreview from "@/components/marketing/PricingPreview";
import CtaBand from "@/components/marketing/CtaBand";
import RevealOnScroll from "@/components/marketing/RevealOnScroll";

export default function LandingPage() {
  return (
    <MarketingShell>
      <ScrollProgress />
      <MarketingNav />
      <Hero />
      <StatusTicker />
      <RevealOnScroll><ProductShowcase /></RevealOnScroll>
      <RevealOnScroll><EnginesSection /></RevealOnScroll>
      <RevealOnScroll><EngineFlowDiagram /></RevealOnScroll>
      <RevealOnScroll><IndustriesSection /></RevealOnScroll>
      <RevealOnScroll><AskAurevynDemo /></RevealOnScroll>
      <RevealOnScroll><ComparisonSection /></RevealOnScroll>
      <RevealOnScroll><ProofSection /></RevealOnScroll>
      <RevealOnScroll><StorefrontBuilderDemo /></RevealOnScroll>
      <RevealOnScroll><PricingPreview /></RevealOnScroll>
      <RevealOnScroll><CtaBand /></RevealOnScroll>
      <MarketingFooter />
    </MarketingShell>
  );
}