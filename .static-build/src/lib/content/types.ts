/** ACTTOLOG content model — typed from the audited prototype schema v3 */

export type Locale = 'en' | 'ne';
/** Bilingual content object (prototype `B()` model) */
export interface Bi { en: string; ne?: string }

export type ContentStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'scheduled' | 'archived' | 'rejected';
export type Access = 'public' | 'members';
export type Audience = 'global' | 'nepal' | 'international' | 'members';

export interface NavItem { id: string; label: Bi; route: string; order: number; visible: boolean }

export interface Division {
  id: string; slug: string; name: Bi; sub: Bi; desc: Bi;
  route: string; color: string; icon: string; art: string; order: number;
  visible: boolean; status?: ContentStatus;
}

export interface ResearchFaq { q: Bi; a: Bi }
export interface ResearchContent {
  kicker: Bi; headline: Bi; line1: Bi; line2: Bi; intro: Bi; tools: Bi;
  noAff: Bi; integrity: Bi; journey: Bi[]; faq: ResearchFaq[];
}
export interface ResearchService {
  id: string; title: Bi; summary: Bi; icon: string; order: number;
  status: ContentStatus; access: Access; visible: boolean;
}
export interface ResearchProgram { id: string; code: string; name: Bi; note: Bi; status: ContentStatus }
export interface ResearchPackage {
  id: string; name: string; tagline: Bi; npr: number; usd: number; interval: Bi;
  desc: Bi; features: Bi[]; mode: string; accent?: string;
  status: ContentStatus; audience?: Audience;
}

export interface EntertainmentItem {
  id: string; slug: string; title: Bi; desc: Bi; thumb: string; media: string;
  category: string; tags: string[]; date: string; audience: Audience;
  access: Access; status: ContentStatus; featured: boolean; visible: boolean;
}

export interface AcademyLesson { title: Bi }
export interface AcademyModule { title: Bi; lessons: (Bi | string)[] }
export interface AcademyCourse {
  id: string; slug: string; title: Bi; level: string; summary: Bi; image: string;
  modules: AcademyModule[]; access: Access; status: ContentStatus;
  featured: boolean; visible: boolean; tags?: string[]; order?: number;
}
export interface AcademyContent { intro: Bi; publicNote: Bi; courses: AcademyCourse[]; tutorials: unknown[] }

export interface Game {
  id: string; slug: string; title: Bi; desc: Bi; thumb: string; url: string;
  category: string; launch: string; access: Access; status: ContentStatus;
  featured: boolean; visible: boolean; release: string;
}

export interface DarkroomResource {
  id: string; slug: string; name: string; url: string;
  category: string; subcategory: string; tags: string[]; type: string;
  pricing: 'Free' | 'Freemium' | 'Paid' | string;
  official: boolean; verification: 'verified' | 'needs-review' | 'broken' | 'suspicious' | string;
  region: string; audience: string; language: string; featured: boolean;
  reviewDate: string; status: ContentStatus; presentation: 'profile' | 'link';
  adminNotes?: string; usage: number;
  short: Bi; full: Bi; visible: boolean;
}
export interface DarkroomCategory { id: string; name: Bi; slug: string; subs: string[]; order: number; visible: boolean }
export interface DarkroomCollection { id: string; name: Bi; desc: Bi; items: string[]; status: ContentStatus }
export interface DarkroomSubmission {
  id: string; name: string; url: string; category: string; desc: string; why: string;
  tags: string[]; by: string; at: string; status: 'pending' | 'published' | 'rejected' | 'needs-review'; checks: string;
}
export interface DarkroomWeights { relevance: number; official: number; verification: number; freshness: number; usage: number }
export interface DarkroomAiRules { autoPublish: boolean; suggestAdmin: boolean; showUser: boolean; trusted: string[] }

export interface BlogPost {
  id: string; slug: string; title: Bi; excerpt: Bi; content: Bi; cover: string;
  author: string; category: string; tags: string[]; publishedAt: string; updatedAt: string;
  status: ContentStatus; access: Access; audience: Audience; featured: boolean; visible?: boolean;
  seoTitle: string; seoDescription: string; socialImage: string;
}

export interface Offer {
  id: string; slug: string; division: string; title: Bi; short: Bi; desc: Bi;
  npr: number; usd: number; mode: 'inquiry' | 'purchase' | 'both';
  features: Bi[]; terms: Bi; validUntil: string; accent: string; art: string;
  status: ContentStatus; access: Access; audience: Audience; featured: boolean; visible: boolean;
}

export interface MediaAsset { id: string; name: string; src: string; type: string; note: string; createdAt: string; usedBy: string }

export interface Role { id: string; name: string; perms: string[]; note: string }
export interface Workflow { direct: string[]; statuses: ContentStatus[]; tz: string }

export interface HomeSection { id: string; title: Bi; body: Bi; visible: boolean }

export interface SeoPage { title: string; desc: string; canon: string; titleNe?: string; descNe?: string }
export interface SeoSettings {
  siteName: string; ogImage: string; locale: string; tw: string;
  pages: Record<string, SeoPage>; robots: string;
}

export interface IntegrationState { s: string; n: string }
export interface SiteSettings {
  brand: string; org: string; tagline: Bi; lines: Bi[];
  purpose: Bi; vision: Bi; mission: Bi; values: string[]; valuesNe: string[];
  story: Bi; future: Bi; responsible: Bi;
  phone: string; email: string; address: string; usdToNpr: number;
  social: Record<string, string>;
  footerNote: Bi; nlNote: Bi; respNote: Bi;
}

export interface ActtologDB {
  v: number;
  settings: SiteSettings;
  nav: NavItem[];
  divisions: Division[];
  research: ResearchContent;
  services: ResearchService[];
  programs: ResearchProgram[];
  packages: ResearchPackage[];
  entertainment: EntertainmentItem[];
  entCats: string[];
  academy: AcademyContent;
  games: Game[];
  drCats: DarkroomCategory[];
  dr: DarkroomResource[];
  drCols: DarkroomCollection[];
  drSubs: DarkroomSubmission[];
  drW: DarkroomWeights;
  drAi: DarkroomAiRules;
  posts: BlogPost[];
  cats: string[];
  offers: Offer[];
  media: MediaAsset[];
  roles: Role[];
  wf: Workflow;
  seo: SeoSettings;
  ai: { provider: string; model: string; webMode: string; keys: boolean; note: string };
  ga: { id: string; enabled: boolean; events: string[] };
  integ: Record<string, IntegrationState>;
  backup: Record<string, unknown>;
  homeSections: HomeSection[];
}
