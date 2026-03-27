import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const ProcessOverview = () => {
  const { t } = useTranslation();

  const steps = [
    { number: "01", titleKey: "process.step1_title", descKey: "process.step1_desc" },
    { number: "02", titleKey: "process.step2_title", descKey: "process.step2_desc" },
    { number: "03", titleKey: "process.step3_title", descKey: "process.step3_desc" },
    { number: "04", titleKey: "process.step4_title", descKey: "process.step4_desc" },
    { number: "05", titleKey: "process.step5_title", descKey: "process.step5_desc" },
  ];

  return (
    <section className="py-24 md:py-32 bg-primary">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-xs font-body font-semibold tracking-[0.3em] uppercase text-gold mb-4 block">
            {t("process.badge")}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
            {t("process.title")}
          </h2>
          <p className="font-body text-primary-foreground/60 text-lg max-w-2xl mx-auto">
            {t("process.subtitle")}
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex gap-8 py-8 border-b border-primary-foreground/10 last:border-0"
            >
              <span className="font-display text-4xl font-bold text-gold/30 shrink-0 w-16">
                {step.number}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-primary-foreground mb-2">
                  {t(step.titleKey)}
                </h3>
                <p className="font-body text-sm text-primary-foreground/60 leading-relaxed">
                  {t(step.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessOverview;
