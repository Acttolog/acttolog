import fs from 'node:fs';
import path from 'node:path';
import { divisions } from '@/lib/content';
import { resolveImage } from '@/lib/utils';
import type { SpatialItem } from '@/components/spatial/types';

const mediaDir = path.join(process.cwd(), 'public', 'media');

function has(rel: string) {
  return fs.existsSync(path.join(mediaDir, rel));
}

function picture(id: string, art = id) {
  if (!has(`${id}.jpg`)) return { image: resolveImage(`art:${art}`) };
  return {
    image: `/media/${id}.jpg`,
    srcSet: has(`derived/${id}-960.webp`)
      ? `/media/derived/${id}-480.webp 480w, /media/derived/${id}-960.webp 960w, /media/${id}.jpg 1600w`
      : undefined,
  };
}

/** Build-time deck data: the seven worlds a visitor can orbit in Spatial View. */
export function spatialGallery(): SpatialItem[] {
  const items: SpatialItem[] = [
    {
      id: 'world',
      title: { en: 'ACTTOLOG World', ne: 'एक्टोलग संसार' },
      sub: { en: 'The living 3D globe', ne: 'जीवित ३डी ग्लोब' },
      desc: {
        en: 'One connected planet — divisions, places, search and map layers inside a single spatial interface.',
        ne: 'एउटै जोडिएको ग्रह — विभाग, स्थान, खोज र नक्सा तहहरू एउटै संसारमा।',
      },
      route: '/explore?mode=earth',
      color: '#35e0ff',
      icon: 'globe',
      tag: 'THE WORLD',
      ...picture('world', 'world'),
    },
  ];

  if (has('nepal/everest-pano-1600.jpg')) {
    items.push({
      id: 'nepal',
      title: { en: 'Nepal', ne: 'नेपाल' },
      sub: { en: 'Himalaya, culture, living heritage', ne: 'हिमाल, संस्कृति, जीवित सम्पदा' },
      desc: {
        en: 'Seven provinces, eight-thousanders, festivals, food and permits — a complete tourism field guide.',
        ne: 'सात प्रदेश, आठ हजार मिटरका हिमाल, चाडपर्व, खाना र अनुमति — पूर्ण पर्यटन निर्देशिका।',
      },
      route: '/nepal',
      color: '#ff4ecd',
      icon: 'compass',
      tag: 'TOURISM',
      image: '/media/nepal/everest-pano-1600.jpg',
      srcSet:
        '/media/nepal/everest-pano-480.jpg 480w, /media/nepal/everest-pano-1024.jpg 1024w, /media/nepal/everest-pano-1600.jpg 1600w',
    });
  }

  for (const d of divisions()) {
    items.push({
      id: d.id,
      title: d.name,
      sub: d.sub,
      desc: d.desc,
      route: d.route,
      color: d.color,
      icon: d.icon,
      tag: `DIVISION ${String(d.order).padStart(2, '0')}`,
      ...picture(d.id, d.art),
    });
  }

  return items;
}
