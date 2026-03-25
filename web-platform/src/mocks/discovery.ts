export type DiscoveryClub = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  logoSrc: string;
  bannerSrc?: string;
  score?: number;
  contentScore?: number;
  collabScore?: number;
};
