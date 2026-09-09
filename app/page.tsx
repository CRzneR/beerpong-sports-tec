import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { PlatformSection } from "@/components/landing/PlatformSection";
import { CommunityStats } from "@/components/landing/CommunityStats";
import { CommunitySection } from "@/components/landing/CommunitySection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <PlatformSection />
        <CommunityStats />
        <CommunitySection />
      </main>

      <Footer />
    </>
  );
}
