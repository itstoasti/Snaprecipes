import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/landing/HeroSection";
import TrustedSources from "@/components/landing/TrustedSources";
import ProblemSolution from "@/components/landing/ProblemSolution";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import FAQs from "@/components/landing/FAQs";
import FinalCTA from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <TrustedSources />
      <ProblemSolution />
      <Features />
      <Testimonials />
      <HowItWorks />
      <Pricing />
      <FAQs />
      <FinalCTA />
      <Footer />
    </>
  );
}
