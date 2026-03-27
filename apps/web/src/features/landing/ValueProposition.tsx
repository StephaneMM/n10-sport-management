import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Shield, Target, Users, GraduationCap } from "lucide-react";

const ValueProposition = () => {
  const { t } = useTranslation();

  const values = [
    { icon: Target, titleKey: "values.strategic_title", descKey: "values.strategic_desc" },
    { icon: Shield, titleKey: "values.eligibility_title", descKey: "values.eligibility_desc" },
    { icon: Users, titleKey: "values.guidance_title", descKey: "values.guidance_desc" },
    { icon: GraduationCap, titleKey: "values.academic_title", descKey: "values.academic_desc" },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.6, delay: i * 0.12, ease: "easeOut" as const },
    }),
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
            {t("values.badge")}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">
            {t("values.title")}
          </h2>
          <p className="font-body text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("values.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {values.map((value, i) => (
            <motion.div
              key={value.titleKey}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              className="group p-8 rounded-lg border border-border bg-card hover:border-accent/40 transition-colors duration-300"
            >
              <div className="w-12 h-12 rounded-md bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <value.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-display text-xl font-semibold text-card-foreground mb-3">
                {t(value.titleKey)}
              </h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                {t(value.descKey)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueProposition;
