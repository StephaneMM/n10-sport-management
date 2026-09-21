import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Testimonial } from "./testimonialData";

type TestimonialCardProps = {
  testimonial: Testimonial;
  index: number;
};

const TestimonialCard = ({ testimonial, index }: TestimonialCardProps) => {
  const { t } = useTranslation();

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="w-[min(22rem,calc(100vw-3rem))] h-fit shrink-0 snap-start rounded-lg border border-border bg-card p-8"
    >
      <Quote className="h-8 w-8 text-accent/30 mb-6" aria-hidden="true" />
      <p className="font-body text-sm text-muted-foreground leading-relaxed mb-8 italic whitespace-pre-line">
        "{t(testimonial.quoteKey)}"
      </p>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-body font-semibold text-card-foreground text-sm">
            {t(testimonial.nameKey)}
            {testimonial.instagramHandle && (
              <span className="font-normal text-muted-foreground"> (@{testimonial.instagramHandle})</span>
            )}
          </p>
          <p className="font-body text-xs text-accent">
            {t(testimonial.sportKey)} · {t(testimonial.destinationKey)}
          </p>
        </div>
        {testimonial.photoSrc && (
          <img
            src={testimonial.photoSrc}
            alt={t(testimonial.nameKey)}
            className="h-20 w-20 shrink-0 rounded-full border-2 border-background object-cover shadow-md"
          />
        )}
      </div>
    </motion.article>
  );
};

export default TestimonialCard;
