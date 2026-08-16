import {
  Camera,
  Globe,
  Heart,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Music,
  Play,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { SocialPlatform } from "@/modules/social/schema";
import { OTHER_ICON_NAMES } from "@/modules/social/schema";

export const PLATFORM_ICONS: Record<Exclude<SocialPlatform, "other">, LucideIcon> =
  {
    instagram: Camera,
    youtube: Play,
    facebook: Users,
    whatsapp: MessageCircle,
    spotify: Music,
  };

export const OTHER_ICON_OPTIONS: {
  name: (typeof OTHER_ICON_NAMES)[number];
  icon: LucideIcon;
}[] = [
  { name: "Globe", icon: Globe },
  { name: "Link", icon: LinkIcon },
  { name: "Play", icon: Play },
  { name: "Camera", icon: Camera },
  { name: "Heart", icon: Heart },
  { name: "Music", icon: Music },
  { name: "Mail", icon: Mail },
  { name: "Instagram", icon: Camera },
  { name: "Youtube", icon: Play },
  { name: "Facebook", icon: Users },
];

export const getSocialIcon = (
  platform: SocialPlatform,
  iconName?: string | null,
): LucideIcon => {
  if (platform !== "other") {
    return PLATFORM_ICONS[platform];
  }

  return (
    OTHER_ICON_OPTIONS.find((item) => item.name === iconName)?.icon ?? Globe
  );
};
