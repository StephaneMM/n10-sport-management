import HeroSection from "./HeroSection";
import ValueProposition from "./ValueProposition";
import ProcessOverview from "./ProcessOverview";
import SuccessStories from "./SuccessStories";
import Footer from "./Footer";

const LandingPage = () => {
  return (
    <main>
      <HeroSection />
      <ValueProposition />
      <SuccessStories />
      <ProcessOverview />
      <Footer />
    </main>
  );
};

export default LandingPage;
