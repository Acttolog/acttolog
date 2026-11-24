import raw from './notices.json';
import type { Bi } from './types';
import {
  CATEGORY_ORDER,
  NOTICE_CATEGORIES,
  type Notice,
  type NoticeMeta,
  type NoticeScope,
} from './notice-utils';
import { urlHost } from './source-utils';

/**
 * ACTTOLOG Notice Board — server-side accessors over the curated ledger.
 *
 * Honesty contract (§48): there is no automated government feed connected.
 * `kind: 'source'` entries are real institutions linked to the official portal
 * that publishes their notices; they carry a `verifiedOn` curation date and no
 * fabricated deadline. `kind: 'notice'` entries are ACTTOLOG's own, and any
 * `closesOn` is our editorial availability window — never a third-party fact.
 * Status and countdowns are computed live in the browser from these dates.
 */

interface NoticeFile {
  meta: NoticeMeta;
  notices: Notice[];
}

const data = raw as unknown as NoticeFile;

export * from './notice-utils';

export const noticeMeta = (): NoticeMeta => data.meta;
export const allNotices = (): Notice[] => data.notices;
export const noticesFor = (scope: NoticeScope): Notice[] =>
  data.notices.filter((n) => n.scope === scope);

/**
 * What each board actually holds. The ledger tagline describes the Loksewa
 * portal directory; the division boards carry ACTTOLOG's own notices, so they
 * must not inherit a claim about government vacancy coverage they don't have.
 */
const SCOPE_TAGLINE: Record<NoticeScope, Bi> = {
  loksewa: data.meta.tagline,
  network: {
    en: 'The open data portals behind ACTTOLOG’s Earth, indicators and maps — each linked to the body that publishes it.',
    ne: 'ACTTOLOG को पृथ्वी, सूचक र नक्साहरूका पछाडिका खुला डाटा पोर्टलहरू — प्रत्येक तिनै प्रकाशन गर्ने निकायमा लिङ्क गरिएको।',
  },
  research: {
    en: 'Research desk notices, plus the official statistics and open-research portals we cite.',
    ne: 'अनुसन्धान डेस्कका सूचना, र हामीले उद्धृत गर्ने आधिकारिक तथ्याङ्क तथा खुला अनुसन्धान पोर्टलहरू।',
  },
  academy: {
    en: 'Enrolment and learning-path notices, plus the official university and examination portals.',
    ne: 'भर्ना र सिकाइ-मार्ग सूचना, र आधिकारिक विश्वविद्यालय तथा परीक्षा पोर्टलहरू।',
  },
  entertainment: {
    en: 'Premiere and schedule notices from the entertainment desk, plus the ministry that publishes media-sector notices.',
    ne: 'मनोरञ्जन डेस्कका प्रिमियर र तालिका सूचना, र सञ्चार क्षेत्रका सूचना प्रकाशित गर्ने मन्त्रालय।',
  },
  games: {
    en: 'Launch and event notices from the games desk.',
    ne: 'गेम्स डेस्कका लन्च र कार्यक्रम सूचना।',
  },
  darkroom: {
    en: 'Resource and review notices from the darkroom, plus the official broadcast portals.',
    ne: 'डार्करुमका स्रोत र समीक्षा सूचना, र आधिकारिक प्रसारण पोर्टलहरू।',
  },
  nepal: {
    en: 'Guide and season notices for Nepal, plus the departments that publish the rules.',
    ne: 'नेपाल गाइड र मौसम सूचना, र नियम प्रकाशन गर्ने विभागहरू।',
  },
};

export const noticeTagline = (scope: NoticeScope): Bi => SCOPE_TAGLINE[scope];

/** Categories present in any list, with counts, in registry order. */
export const noticeCategoriesOf = (list: Notice[]) =>
  CATEGORY_ORDER.filter((id) => list.some((n) => n.category === id)).map((id) => ({
    id,
    label: NOTICE_CATEGORIES[id].label,
    color: NOTICE_CATEGORIES[id].color,
    count: list.filter((n) => n.category === id).length,
  }));

/** Categories present in a scope, with counts, in registry order. */
export const noticeCategoriesFor = (scope: NoticeScope) => noticeCategoriesOf(noticesFor(scope));

/**
 * Featured entries for the homepage deck card — a cross-section of the network
 * rather than the first scope in the ledger. Loksewa leads with two entries,
 * then one per remaining division. `excludeHosts` drops portals the homepage
 * already states elsewhere (the source ledger), so no portal is named twice on
 * one page; filtering happens before selection so the card still fills up.
 */
export const noticeFeatured = (limit = 6, excludeHosts?: ReadonlySet<string>): Notice[] => {
  const feat = data.notices.filter(
    (n) => n.featured && !(excludeHosts && n.sourceUrl && excludeHosts.has(urlHost(n.sourceUrl))),
  );
  const diverse = (list: Notice[]): Notice[] => {
    const seen = new Set<string>();
    const first: Notice[] = [];
    const rest: Notice[] = [];
    for (const n of list) {
      if (seen.has(n.category)) rest.push(n);
      else { seen.add(n.category); first.push(n); }
    }
    return [...first, ...rest];
  };
  const scopes: NoticeScope[] = ['loksewa', 'research', 'entertainment', 'games', 'academy', 'darkroom', 'nepal'];
  const queues = scopes.map((s) => diverse(feat.filter((n) => n.scope === s)));
  const out: Notice[] = [];
  let round = 0;
  while (out.length < limit && queues.some((q) => q.length)) {
    for (let i = 0; i < queues.length && out.length < limit; i++) {
      const take = i === 0 && round === 0 ? 2 : 1;
      for (let k = 0; k < take && queues[i].length && out.length < limit; k++) {
        out.push(queues[i].shift() as Notice);
      }
    }
    round++;
  }
  return out;
};

export const noticeCounts = () => {
  const lk = noticesFor('loksewa');
  return {
    total: data.notices.length,
    loksewa: lk.length,
    government: lk.filter((n) => n.category === 'government').length,
    sansthan: lk.filter((n) => n.category === 'sansthan').length,
    bank: lk.filter((n) => n.category === 'bank').length,
  };
};