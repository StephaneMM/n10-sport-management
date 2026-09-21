import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import TestimonialCard from "./TestimonialCard";
import { testimonials } from "./testimonialData";

const SuccessStories = () => {
  const { t } = useTranslation();
  const storiesTrackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const storiesTrack = storiesTrackRef.current;

    if (!storiesTrack) {
      return;
    }

    const updateScrollButtons = () => {
      const maxScrollLeft = storiesTrack.scrollWidth - storiesTrack.clientWidth;
      setCanScrollLeft(storiesTrack.scrollLeft > 1);
      setCanScrollRight(storiesTrack.scrollLeft < maxScrollLeft - 1);
    };

    updateScrollButtons();
    storiesTrack.addEventListener("scroll", updateScrollButtons, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollButtons);

    resizeObserver.observe(storiesTrack);

    return () => {
      storiesTrack.removeEventListener("scroll", updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, []);

  const scrollStories = (direction: "left" | "right") => {
    storiesTrackRef.current?.scrollBy({
      left: direction === "right" ? 400 : -400,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-xs font-body font-semibold tracking-[0.3em] uppercase text-accent mb-4 block">
            {t("stories.badge")}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
            {t("stories.title")}
          </h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-5 inline-flex items-center gap-2 font-body text-xs text-muted-foreground"
          >
            {t("stories.scroll_hint")}
            <ArrowRight className="h-4 w-4 animate-pulse text-accent" aria-hidden="true" />
          </motion.p>
        </motion.div>

        <div className="relative max-w-6xl mx-auto">
          {canScrollLeft && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute start-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 shadow-md"
              aria-label={t("stories.previous")}
              onClick={() => scrollStories("left")}
            >
              <ArrowLeft />
            </Button>
          )}
          {canScrollRight && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute end-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 shadow-md"
              aria-label={t("stories.next")}
              onClick={() => scrollStories("right")}
            >
              <ArrowRight />
            </Button>
          )}
          <div
            ref={storiesTrackRef}
            className="flex items-start gap-8 overflow-x-auto pb-4 snap-x snap-mandatory"
            aria-label={t("stories.title")}
            role="region"
            tabIndex={0}
          >
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={testimonial.quoteKey} testimonial={testimonial} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuccessStories;
