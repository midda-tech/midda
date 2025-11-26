import carrotIcon from "@/assets/icons/carrot.png";
import cheeseIcon from "@/assets/icons/cheese.png";
import chickenIcon from "@/assets/icons/chicken.png";
import fishIcon from "@/assets/icons/fish.png";
import lemonIcon from "@/assets/icons/lemon.png";
import meatIcon from "@/assets/icons/meat.png";
import pastaIcon from "@/assets/icons/pasta.png";
import saladIcon from "@/assets/icons/salad.png";
import soupIcon from "@/assets/icons/soup.png";
import tomatoIcon from "@/assets/icons/tomato.png";

export const getRecipeIcon = (iconNumber: number | null): string => {
  const iconMap: Record<number, string> = {
    1: carrotIcon,
    2: cheeseIcon,
    3: chickenIcon,
    4: fishIcon,
    5: lemonIcon,
    6: meatIcon,
    7: pastaIcon,
    8: saladIcon,
    9: soupIcon,
    10: tomatoIcon,
  };

  return iconMap[iconNumber || 1] || carrotIcon;
};
