import type { Bi } from '@/lib/content/types';

export interface SpatialItem {
  id: string;
  title: Bi;
  sub: Bi;
  desc: Bi;
  route: string;
  color: string;
  icon: string;
  tag: string;
  image: string;
  srcSet?: string;
}

export const SPATIAL_EVENT = 'acttolog:spatial';

export interface SpatialEventDetail {
  id?: string;
}
