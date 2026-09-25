import mathisPhoto from "@/assets/testimonials/mathis.jpeg";
import elMirTraqPhoto from "@/assets/testimonials/el-mir-traq.jpeg";
import naimPhoto from "@/assets/testimonials/naim.jpeg";
import chouaouiPhoto from "@/assets/testimonials/chouai.jpeg";

export type Testimonial = {
  quoteKey: string;
  nameKey: string;
  sportKey: string;
  destinationKey: string;
  photoSrc?: string;
  instagramHandle?: string;
};

export const testimonials: Testimonial[] = [
  {
    quoteKey: "stories.mathis_quote",
    nameKey: "stories.mathis_name",
    sportKey: "stories.volleyball",
    destinationKey: "stories.student_athlete",
    photoSrc: mathisPhoto,
    instagramHandle: "Mathis.tpn",
  },
  {
    quoteKey: "stories.naim_dad_quote1",
    nameKey: "stories.naim_dad_name",
    sportKey: "stories.parent",
    destinationKey: "stories.naim_family",
    photoSrc: chouaouiPhoto,
  },
  {
    quoteKey: "stories.naim_quote",
    nameKey: "stories.naim_name",
    sportKey: "stories.volleyball",
    destinationKey: "stories.student_athlete",
    photoSrc: naimPhoto,
    instagramHandle: "Mach.1.1",
  },
  {
    quoteKey: "stories.naim_dad_quote2_and_3",
    nameKey: "stories.naim_dad_name",
    sportKey: "stories.parent",
    destinationKey: "stories.naim_family",
    photoSrc: chouaouiPhoto,
  },
  {
    quoteKey: "stories.samy_mom_quote",
    nameKey: "stories.samy_mom_name",
    sportKey: "stories.parent",
    destinationKey: "stories.samy_ryan_family",
    photoSrc: elMirTraqPhoto,
  },
  {
    quoteKey: "stories.naim_dad_quote4",
    nameKey: "stories.naim_dad_name",
    sportKey: "stories.parent",
    destinationKey: "stories.naim_family",
    photoSrc: chouaouiPhoto,
  },
];
