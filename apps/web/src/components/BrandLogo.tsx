import logo from "@/assets/logos/white_logo_transparent_background.png";

type BrandLogoProps = {
  className?: string;
};

const BrandLogo = ({ className = "h-10 w-auto" }: BrandLogoProps) => (
  <img src={logo} alt="N10 Sport Management" className={`object-contain ${className}`} />
);

export default BrandLogo;
