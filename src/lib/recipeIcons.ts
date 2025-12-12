import icon1 from "@/assets/icons/1.png";
import icon2 from "@/assets/icons/2.png";
import icon3 from "@/assets/icons/3.png";
import icon4 from "@/assets/icons/4.png";
import icon5 from "@/assets/icons/5.png";
import icon6 from "@/assets/icons/6.png";
import icon7 from "@/assets/icons/7.png";
import icon8 from "@/assets/icons/8.png";
import icon9 from "@/assets/icons/9.png";
import icon10 from "@/assets/icons/10.png";
export const DEFAULT_ICON = 1;

const iconMap: Record<number, string> = {
  1: icon1,
  2: icon2,
  3: icon3,
  4: icon4,
  5: icon5,
  6: icon6,
  7: icon7,
  8: icon8,
  9: icon9,
  10: icon10,
};

export const getRecipeIcon = (iconNumber: number | null | undefined): string => {
  return iconMap[iconNumber ?? DEFAULT_ICON] ?? iconMap[DEFAULT_ICON];
};