import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const stories = [
  { quoteKey: "stories.quote1", name: "Erik L.", sport: "Basketball", destination: "NCAA Division I" },
  { quoteKey: "stories.quote2", name: "Amara K.", sport: "Track & Field", destination: "NAIA" },
  { quoteKey: "stories.quote3", name: "Lucas M.", sport: "Soccer", destination: "NCAA Division II" },
];

const SuccessStories = () => {
  const { t } = useTranslation();

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {stories.map((story, i) => (
            <motion.div
              key={story.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 rounded-lg border border-border bg-card"
            >
              <Quote className="h-8 w-8 text-accent/30 mb-6" />
              <p className="font-body text-sm text-muted-foreground leading-relaxed mb-8 italic">
                "{t(story.quoteKey)}"
              </p>
              <div>
                <p className="font-body font-semibold text-card-foreground text-sm">{story.name}</p>
                <p className="font-body text-xs text-accent">
                  {story.sport} · {story.destination}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessStories;
