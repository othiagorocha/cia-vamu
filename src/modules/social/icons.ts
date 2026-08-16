import type { IconType } from "react-icons";
import {
  FaCamera,
  FaEnvelope,
  FaFacebook,
  FaGlobe,
  FaHeart,
  FaInstagram,
  FaLink,
  FaMusic,
  FaPlay,
  FaSpotify,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";

import type { SocialPlatform } from "@/modules/social/schema";
import { OTHER_ICON_NAMES } from "@/modules/social/schema";

export const PLATFORM_ICONS: Record<
  Exclude<SocialPlatform, "other">,
  IconType
> = {
  instagram: FaInstagram,
  youtube: FaYoutube,
  facebook: FaFacebook,
  whatsapp: FaWhatsapp,
  spotify: FaSpotify,
};

export const OTHER_ICON_OPTIONS: {
  name: (typeof OTHER_ICON_NAMES)[number];
  icon: IconType;
}[] = [
  { name: "Globe", icon: FaGlobe },
  { name: "Link", icon: FaLink },
  { name: "Play", icon: FaPlay },
  { name: "Camera", icon: FaCamera },
  { name: "Heart", icon: FaHeart },
  { name: "Music", icon: FaMusic },
  { name: "Mail", icon: FaEnvelope },
  { name: "Instagram", icon: FaInstagram },
  { name: "Youtube", icon: FaYoutube },
  { name: "Facebook", icon: FaFacebook },
];

export const getSocialIcon = (
  platform: SocialPlatform,
  iconName?: string | null,
): IconType => {
  if (platform !== "other") {
    return PLATFORM_ICONS[platform];
  }

  return (
    OTHER_ICON_OPTIONS.find((item) => item.name === iconName)?.icon ?? FaGlobe
  );
};
