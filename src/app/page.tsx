import HeroSection from "@/components/home/HeroSection";
import InteractiveRadarDemo from "@/components/home/InteractiveRadarDemo";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import StatsSection from "@/components/home/StatsSection";
import CtaSection from "@/components/home/CtaSection";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <HeroSection />
      <InteractiveRadarDemo />
      <HowItWorksSection />
      <StatsSection />
      <CtaSection />
    </main>
  );
}
