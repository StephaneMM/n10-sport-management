import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import TestimonialCard from "./TestimonialCard";
import { testimonials } from "./testimonialData";

const SuccessStories = () => {
  const { t } = useTranslation();
  const storiesTrackRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const storiesTrack = storiesTrackRef.current;

    if (!storiesTrack || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let animationFrame: number;

    const autoScroll = () => {
      if (isPausedRef.current) {
        animationFrame = window.requestAnimationFrame(autoScroll);
        return;
      }

      const maxScrollLeft = storiesTrack.scrollWidth - storiesTrack.clientWidth;

      if (maxScrollLeft > 0) {
        storiesTrack.scrollLeft += 0.2;

        if (storiesTrack.scrollLeft >= maxScrollLeft) {
          storiesTrack.scrollLeft = 0;
        }
      }

      animationFrame = window.requestAnimationFrame(autoScroll);
    };

    animationFrame = window.requestAnimationFrame(autoScroll);

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

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
        </motion.div>

        <div
          ref={storiesTrackRef}
          className="flex max-w-6xl mx-auto items-start gap-8 overflow-x-auto pb-4 snap-x snap-mandatory"
          aria-label={t("stories.title")}
          role="region"
          tabIndex={0}
          onMouseEnter={() => {
            isPausedRef.current = true;
          }}
          onMouseLeave={() => {
            isPausedRef.current = false;
          }}
          onFocus={() => {
            isPausedRef.current = true;
          }}
          onBlur={() => {
            isPausedRef.current = false;
          }}
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.quoteKey}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessStories;
