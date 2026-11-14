import raw from './loksewa.json';

/**
 * Loksewa Ghar — bundled, typed, bilingual content for the Nepal civil
 * service exam hub. Same pattern as the Nepal guide: real copy, no fabricated
 * metrics, `{ en, ne }` resolution, server-side only.
 *
 * Structure, marks and negative marking are compiled from public information
 * about the Commission's Section Officer selection; the disclaimer travels
 * with the data so no page can render without it.
 */

export interface LkBi {
  en: string;
  ne: string;
}

export interface LkUnit {
  slug: string;
  title: LkBi;
  points: string[];
}

export interface LkSubject {
  slug: string;
  title: LkBi;
  units: LkUnit[];
}

export interface LkPaper {
  slug: string;
  color: string;
  title: LkBi;
  short: LkBi;
  intro: LkBi;
  strategy: LkBi;
  subjects: LkSubject[];
}

export interface LkStage {
  id: string;
  order: number;
  title: LkBi;
  marks: number;
  negative: number;
  kind: LkBi;
  note: LkBi;
}

export interface LkQuestion {
  paper: string;
  q: LkBi;
  options: LkBi[];
  answer: number;
  explain: LkBi;
}

export interface LkLaw {
  name: LkBi;
  year: string;
  why: LkBi;
}

export interface LkSource {
  name: LkBi;
  url: string;
  use: LkBi;
}

export interface LkMethod {
  step: number;
  title: LkBi;
  body: LkBi;
}

const data = raw as unknown as {
  meta: { name: LkBi; tagline: LkBi; focusLevel: LkBi; disclaimer: LkBi; updatedSeason: LkBi };
  sources: LkSource[];
  stages: LkStage[];
  papers: LkPaper[];
  laws: LkLaw[];
  mediums: { id: string; label: LkBi }[];
  method: LkMethod[];
  practice: LkQuestion[];
};

export const loksewaMeta = () => data.meta;
export const loksewaSources = () => data.sources;
export const loksewaStages = () => [...data.stages].sort((a, b) => a.order - b.order);
export const loksewaPapers = () => data.papers;
export const loksewaLaws = () => data.laws;
export const loksewaMediums = () => data.mediums;
export const loksewaMethod = () => data.method;

export const loksewaPaper = (slug: string) => data.papers.find((p) => p.slug === slug) ?? null;

export const loksewaSubject = (paper: string, subject: string) => {
  const p = loksewaPaper(paper);
  return p?.subjects.find((s) => s.slug === subject) ?? null;
};

export const loksewaPractice = (paper?: string) =>
  paper ? data.practice.filter((q) => q.paper === paper) : data.practice;

/** Written marks, objective marks and the total the Commission publishes. */
export const loksewaTotals = () => {
  const stages = loksewaStages();
  const sum = (ids: string[]) => stages.filter((s) => ids.includes(s.id)).reduce((a, s) => a + s.marks, 0);
  return {
    objective: sum(['pre']),
    written: sum(['governance', 'contemporary', 'service']),
    selection: sum(['it', 'group', 'interview']),
    all: stages.reduce((a, s) => a + s.marks, 0),
  };
};

export const loksewaCounts = () => ({
  papers: data.papers.length,
  subjects: data.papers.reduce((a, p) => a + p.subjects.length, 0),
  folders: data.papers.reduce((a, p) => a + p.subjects.reduce((b, s) => b + s.units.length, 0), 0),
  points: data.papers.reduce(
    (a, p) => a + p.subjects.reduce((b, s) => b + s.units.reduce((c, u) => c + u.points.length, 0), 0),
    0,
  ),
  laws: data.laws.length,
  questions: data.practice.length,
});

/** Breadcrumb helper shared by the paper and subject pages. */
export const loksewaCrumb = (label: LkBi, href: string) => ({ label, href });

/* ── printable documents ─────────────────────────────────────────
 * Every block below is derived from the syllabus tree in this file, so a
 * printed document can never contain a subject or point the site doesn't
 * already list. Nothing here is invented to fill space.
 */

export interface LkDocTitle {
  ne: string;
  en: string;
  desc: LkBi;
}

export const loksewaDocTitles = (): Record<string, LkDocTitle> => {
  const out: Record<string, LkDocTitle> = {
    full: {
      ne: 'सम्पूर्ण पाठ्यक्रम नक्सा',
      en: 'Complete syllabus map',
      desc: {
        ne: 'चार पेपर, सबै विषय, फोल्डर र बुँदा एकै कागजमा — चरण-अङ्क तालिका र रैंक विधि सहित।',
        en: 'Every paper, subject, folder and syllabus point on one document, with the stage/marks table and the rank-first method.',
      },
    },
    planner: {
      ne: 'तयारी योजना र चेकलिस्ट',
      en: 'Study plan and folder checklist',
      desc: {
        ne: 'हप्ता अनुसार बाँडिएको सुझाव योजना र ५७ फोल्डरको दोहोरो पठन चेकलिस्ट — छापेर دیवारमा टाँस्ने।',
        en: 'A week-by-week suggested plan built from the real folder tree, plus the full checklist to print and pin up.',
      },
    },
    laws: {
      ne: 'कानून दस्तावेज सूची',
      en: 'Law documents reading list',
      desc: {
        ne: 'पढ्नुपर्ने कानून, किन पढ्ने र कुन आधिकारिक स्रोतबाट पढ्ने — स्रोत ठेगाना सहित।',
        en: 'Which acts to read, why each matters and which official portal to read it from.',
      },
    },
    practice: {
      ne: 'नमुना प्रश्नपत्र र उत्तर कुञ्जी',
      en: 'Model question set with answer key',
      desc: {
        ne: 'ACTTOLOG ले विषसूचीका बुँदाबाट लेखेको अभ्यास प्रश्नपत्र, छुट्टाउँदा उत्तर कुञ्जी व्याख्या सहित।',
        en: 'Practice items written by ACTTOLOG from the listed syllabus points, with a separate answer key and explanations.',
      },
    },
  };
  for (const p of data.papers) {
    out[p.slug] = {
      ne: `${p.title.ne} — पाठ्यक्रम र चेकलिस्ट`,
      en: `${p.title.en} — syllabus and checklist`,
      desc: p.intro,
    };
  }
  return out;
};

/**
 * Where each listed law can actually be read. Deep links are not guessed:
 * the consolidated statute collection is the Law Commission's own site, and
 * the civil-service laws are listed on the Ministry's act/regulation page.
 */
const LAW_SOURCE: Record<string, string> = {
  'Public Service Commission Act': 'https://psc.gov.np',
  'Civil Service Act': 'https://moha.gov.np/en/page/act-regulation',
  'Civil Service Rules': 'https://moha.gov.np/en/page/act-regulation',
  'Schedule of Posts Act': 'https://moha.gov.np/en/page/act-regulation',
  'Departmental Process Act': 'https://moha.gov.np/en/page/act-regulation',
};

export const loksewaLawDoc = () => ({
  note: {
    ne: 'कुनै पनि कानूनको अन्तिम पाठ संसद वा मन्त्रालयले प्रकाशन गरेकोपाठ हो। तलको स्रोत आधिकारिक पोर्टल हो; मसिनो भाषा त्यहीँबाट पढ्नुहोस्।',
    en: 'The authoritative text of every act is the version published by the Government of Nepal. The source column is the official portal to read it from.',
  },
  rows: data.laws.map((l) => ({
    ...l,
    source: LAW_SOURCE[l.name.en] ?? 'https://lawcommission.gov.np',
  })),
});

export interface LkWeek {
  n: number;
  focus: LkBi;
  tasks: LkBi[];
}

const PLAN_WEEKS = 12;

/**
 * A suggested cycle: the 17 subjects are dealt two at a time, then two full
 * revision passes, then mock tests and the selection-stage prep. Counts come
 * from the tree, so the plan is the same size as the real syllabus.
 */
export const loksewaPlan = (): { weeks: LkWeek[]; note: LkBi } => {
  const flat = data.papers.flatMap((p) => p.subjects.map((s) => ({ p, s })));
  const studyWeeks = Math.max(1, Math.ceil(flat.length / 2));
  const weeks: LkWeek[] = [];
  for (let i = 0; i < studyWeeks; i += 1) {
    const pair = flat.slice(i * 2, i * 2 + 2);
    const points = pair.reduce((a, { s }) => a + s.units.reduce((b, u) => b + u.points.length, 0), 0);
    const folders = pair.reduce((a, { s }) => a + s.units.length, 0);
    weeks.push({
      n: weeks.length + 1,
      focus: {
        ne: pair.map(({ s }) => s.title.ne).join(' + '),
        en: pair.map(({ s }) => s.title.en).join(' + '),
      },
      tasks: [
        {
          ne: `${folders} फोल्डर · ${points} बुँदा पहिलो पटक पढ्ने, छेउमा नोट लेख्ने`,
          en: 'Read the first pass of ' + folders + ' folders and ' + points + ' points, writing marginal notes',
        },
        {
          ne: 'हरेक फोल्डरको अन्त्यमा आफैँ १० प्रश्न सोध्ने',
          en: 'Set yourself 10 questions at the end of each folder',
        },
        {
          ne: 'अघिल्लो हप्ताको कागज १५ मिनेटमा दोहोरो पार्ने',
          en: "Recall last week's pages in 15 minutes",
        },
      ],
    });
  }
  const remaining = PLAN_WEEKS - weeks.length;
  const passes = Math.max(2, Math.ceil(remaining / 2));
  for (let i = 0; i < passes && weeks.length < PLAN_WEEKS - 1; i += 1) {
    const p = data.papers[i % data.papers.length];
    weeks.push({
      n: weeks.length + 1,
      focus: {
        ne: `छिटो दोहोरो — ${p.title.ne}`,
        en: 'Fast pass — ' + p.title.en,
      },
      tasks: [
        {
          ne: `${p.subjects.length} विषयका ${p.subjects.reduce((a, s) => a + s.units.length, 0)} फोल्डरको टोपी मात्र पढ्ने`,
          en: 'Read only the folder headings across all ' + p.subjects.length + ' subjects',
        },
        {
          ne: 'कुनै पनि बुँदा सम्झन नसकेको ठाउँ रातो चिन्ह लगाउने',
          en: 'Mark every point you cannot recall, in red',
        },
        {
          ne: 'रातो चिन्ह लगाएका बुँदा फेरि पढ्ने र दोस्रो पटक जाँच्ने',
          en: 'Re-read the red marks and test them again the same week',
        },
      ],
    });
  }
  while (weeks.length < PLAN_WEEKS - 1) {
    weeks.push({
      n: weeks.length + 1,
      focus: { ne: 'नक्कली परीक्षण', en: 'Mock test week' },
      tasks: [
        { ne: 'समय तोकेर पूरा पेपर हल गर्ने', en: 'Finish one full paper against the clock' },
        { ne: 'गलत उत्तरको कारण लेख्ने — थाहा नभए/भुले/समय नपुगे', en: 'Write why each answer was wrong: unknown, misremembered, or ran out of time' },
        { ne: 'नकारात्मक घटाइको अभ्यास — अनिश्चितमा खाली राख्ने बानी', en: 'Practise leaving uncertain answers blank against the negative marking' },
      ],
    });
  }
  weeks.push({
    n: PLAN_WEEKS,
    focus: {
      ne: 'छनौट चरण तयारी — IT सीप, सामूहिक र अन्तर्वार्ता',
      en: 'Selection-stage prep — IT test, group task and interview',
    },
    tasks: [
      { ne: 'दैनिक ३० मिनेत कम्प्युटर सञ्चालन अभ्यास', en: 'Thirty minutes of computer operation practice daily' },
      { ne: 'एउटा विषयमा ५ मिनेत बोलेर सुनाउने अभ्यास', en: 'Speak one topic for five minutes and listen back' },
      { ne: 'आफ्नो परिचय, किन सेवा चाहिन्छ र एक सामाजिक मुद्दाको समाधान तयार राख्ने', en: 'Have your introduction, your reason for joining the service, and one solution to a local issue ready' },
    ],
  });
  return {
    weeks,
    note: {
      ne: 'यो ACTTOLOG ले विषसूचीका फोल्डर गनेर सुझाएको योजना हो, आयोगको आधिकारिक क्यालेन्डर होइन। हप्ताको लम्बाइ आफ्नो समय अनुसार बदल्न सकिन्छ।',
      en: 'This plan is ACTTOLOG’s suggestion built by counting the folders in the syllabus — it is not a Commission calendar. Stretch or compress each week to fit the hours you actually have.',
    },
  };
};

/** Folder totals per paper, for the download cards and explorer. */
export const loksewaPaperCounts = (slug: string) => {
  const p = loksewaPaper(slug);
  if (!p) return { subjects: 0, folders: 0, points: 0 };
  return {
    subjects: p.subjects.length,
    folders: p.subjects.reduce((a, s) => a + s.units.length, 0),
    points: p.subjects.reduce((a, s) => a + s.units.reduce((b, u) => b + u.points.length, 0), 0),
  };
};
