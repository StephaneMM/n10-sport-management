import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-primary border-t border-primary-foreground/10">
      <div className="container px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-display text-2xl font-bold text-primary-foreground mb-4">
              N10<span className="text-gold">.</span>
            </h3>
            <p className="font-body text-sm text-primary-foreground/50 max-w-sm leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-primary-foreground/40 mb-4">
              {t("footer.platform")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/apply"
                  className="font-body text-sm text-primary-foreground/60 hover:text-gold transition-colors"
                >
                  {t("footer.apply_now")}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/login"
                  className="font-body text-xs text-primary-foreground/30 hover:text-primary-foreground/50 transition-colors"
                >
                  {t("footer.admin_login")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-primary-foreground/40 mb-4">
              {t("footer.contact")}
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:contact@n10sport.com" className="font-body text-sm text-primary-foreground/60 hover:text-gold transition-colors">
                  contact@n10sport.com
                </a>
              </li>
              <li>
                <a href="https://instagram.com/n10sport" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-primary-foreground/60 hover:text-gold transition-colors">
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/company/n10sport" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-primary-foreground/60 hover:text-gold transition-colors">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-primary-foreground/10">
          <p className="font-body text-xs text-primary-foreground/30 text-center">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
