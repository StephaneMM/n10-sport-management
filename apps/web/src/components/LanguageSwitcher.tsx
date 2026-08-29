import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ar", label: "العربية", flag: "🇲🇦"},
];

interface LanguageSwitcherProps {
  variant?: "light" | "dark";
}

const LanguageSwitcher = ({ variant = "dark" }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
    document.documentElement.dir = value === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = value;
  };

  const current = languages.find((l) => l.code === i18n.language) ?? languages[0];

  const triggerClass =
    variant === "light"
      ? "bg-transparent border-border text-foreground hover:bg-secondary"
      : "bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/5";

  return (
    <Select value={current.code} onValueChange={handleChange}>
      <SelectTrigger
        className={`w-[140px] h-9 font-body text-sm gap-2 ${triggerClass}`}
      >
        <Globe className="h-4 w-4 shrink-0 opacity-60" />
        <SelectValue>
          {current.flag} {current.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="font-body text-sm">
            {lang.flag} {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
