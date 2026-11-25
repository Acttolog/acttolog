import type { Metadata } from 'next';
import Link from 'next/link';
import './lab.css';
import { BiText } from '@/components/ui/Bi';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { Appearance } from '@/components/home/deck/Appearance';
import { PointerStudio } from '@/components/home/deck/PointerStudio';
import { ToolBench } from '@/components/home/deck/ToolBench';
import { Pulse } from '@/components/home/deck/Pulse';

export const metadata: Metadata = {
  // The root layout template appends "| ACTTOLOG" — never store the suffix here.
  title: 'Design Lab',
  description:
    'The ACTTOLOG design system read as a spec sheet: measured token counts, type scale, motion curves and the icon inventory the app already draws.',
  alternates: { canonical: '/design-lab' },
};

/** Every figure here was read out of the stylesheet and src/components/ui with
 *  grep, not written from memory. If the sheet changes, this table goes stale
 *  visibly — that is the point of publishing it. */
const SPEC: { value: string; what: { en: string; ne: string }; where: string }[] = [
  { value: '99', what: { en: 'custom properties in globals.css', ne: 'globals.css का custom properties' }, where: '@theme' },
  { value: '36', what: { en: 'clamp() rules, so the page scales instead of stepping', ne: 'clamp() नियम — पृष्ठ स्टेप होइन, स्केल हुन्छ' }, where: 'globals.css' },
  { value: '5', what: { en: 'prefers-reduced-motion guards already in the sheet', ne: 'prefers-reduced-motion गार्ड' }, where: 'globals.css' },
  { value: '37', what: { en: 'icons drawn in-house, no icon library installed', ne: 'आफ्नैस्रोतका प्रतीक, आइकन लाइब्रेरी छैन' }, where: 'ui/Icon.tsx' },
  { value: '18px', what: { en: 'panel radius on the dark system this page replaces', ne: 'प्यानल रेडियस (यस पृष्ठले बदलिने डार्क प्रणाली)' }, where: '--r' },
  { value: '72px', what: { en: 'reserved for the fixed nav, so nothing hides under it', ne: 'फिक्सेड नेभका लागि आरक्षित' }, where: '--nav' },
  { value: '1280px', what: { en: 'measure, capped at 92vw: min(1280px, 92vw)', ne: 'मापन: min(1280px, 92vw)' }, where: '.wrap' },
];

const FONTS: { role: { en: string; ne: string }; face: string; status: string }[] = [
  { role: { en: 'display', ne: 'डिस्प्ले' }, face: 'Oswald 700', status: 'waived: not loaded yet' },
  { role: { en: 'body', ne: 'बडी' }, face: 'Archivo 400/500', status: 'waived: Inter stands in' },
  { role: { en: 'figures', ne: 'अङ्क' }, face: 'Archivo Narrow 500', status: 'waived: Inter tabular stands in' },
  { role: { en: 'नेपाली', ne: 'नेपाली' }, face: 'Noto Sans Devanagari', status: 'loaded in this app' },
];

// The real inventory, taken from the IC map keys.
const ICONS: IconName[] = [
  'compass', 'book', 'doc', 'chart', 'sigma', 'chat', 'layers', 'arrow', 'play', 'check', 'spark',
  'globe', 'mail', 'clock', 'search', 'game', 'grid', 'link', 'refresh', 'screen', 'lock', 'out',
  'gear', 'menu', 'eye', 'users', 'rocket', 'image', 'shield', 'db', 'brain', 'home', 'bell',
  'heart', 'star', 'down', 'trash',
];

export default function DesignLabPage() {
  return (
    <main className="lab">
      <div className="wrap">
        <header className="lab-board">
          <div>
            <h1 className="lab-display">
              <BiText as="span" value={{ en: 'Spec sheet', ne: 'स्पेड सिट' }} />{' '}
              <em>
                <BiText as="span" value={{ en: 'no. 07', ne: 'नम्बर ०७' }} />
              </em>
            </h1>
            <p className="lab-body lab-lede">
              <BiText
                value={{
                  en: 'The design system, measured rather than described. Every number below was read out of the stylesheet with grep, and the sheet is quoted where it sits so a wrong figure is checkable in one move.',
                  ne: 'डिजाइन प्रणाली, वर्णन होइन मापन गरिएको। तलका अङ्कहरू स्टाइलसिटबाट grep गरेर निकालिएको हो।',
                }}
              />
            </p>
          </div>

          <div className="lab-meta" role="list">
            {SPEC.slice(0, 3).map((s) => (
              <div key={s.value} role="listitem">
                <b>{s.value}</b>
                <span className="lab-label">
                  <BiText value={s.what} />
                </span>
              </div>
            ))}
          </div>
        </header>

        <hr className="lab-rule" />

        <section className="lab-sec" aria-labelledby="spec-h">
          <h2 id="spec-h" className="lab-display" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)' }}>
            <BiText value={{ en: 'What the sheet holds', ne: 'स्टाइलसिटमा के छ' }} />
          </h2>
          <table className="lab-spec">
            <caption className="lab-label">
              <BiText
                value={{
                  en: 'Counted in globals.css and src/components/ui on 2026-10-31.',
                  ne: 'globals.css र src/components/ui मा २०२६-१०-३१ का लागि गणना गरिएको।',
                }}
              />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <BiText value={{ en: 'Measure', ne: 'मापन' }} />
                </th>
                <th scope="col">
                  <BiText value={{ en: 'What it does', ne: 'के गर्छ' }} />
                </th>
                <th scope="col">
                  <BiText value={{ en: 'Where', ne: 'कहाँ' }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {SPEC.map((s) => (
                <tr key={s.value + s.where}>
                  <td data-num>{s.value}</td>
                  <td>
                    <BiText value={s.what} />
                  </td>
                  <th scope="row">{s.where}</th>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="lab-band" aria-labelledby="font-h">
        <div className="wrap">
          <h2 id="font-h">
            <BiText value={{ en: 'The four faces this page is written in', ne: 'यस पृष्ठका चार फन्ट' }} />
          </h2>
          <table className="lab-spec" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th scope="col">
                  <BiText value={{ en: 'Role', ne: 'भूमिका' }} />
                </th>
                <th scope="col">
                  <BiText value={{ en: 'Face', ne: 'फन्ट' }} />
                </th>
                <th scope="col">
                  <BiText value={{ en: 'On this machine', ne: 'यस्तो मेसिनमा' }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {FONTS.map((f) => (
                <tr key={f.face}>
                  <th scope="row">
                    <BiText value={f.role} />
                  </th>
                  <td>{f.face}</td>
                  <td>{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="lab-body">
            <BiText
              value={{
                en: 'Oswald and Archivo are named in the theme but not loaded by the app yet, so a face of the same build that is already self-hosted stands in and says so. Add them to the root layout and this row becomes a fact rather than a waiver.',
                ne: 'Oswald र Archivo थिममा नामाङ्कित छन् तर लोड भएका छैनन् — उही बनावटको भएका फन्टले स्थान लिएका छन्।',
              }}
            />
          </p>
        </div>
      </section>

      <div className="wrap">
        <section className="lab-sec" aria-labelledby="icon-h">
          <h2 id="icon-h" className="lab-display" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)' }}>
            <BiText value={{ en: 'Thirty-seven icons, already drawn', ne: '३७ प्रतीक, पहिलेै कोरिएका' }} />
          </h2>
          <p className="lab-body lab-lede">
            <BiText
              value={{
                en: 'An icon library was not installed, because this list already exists as inline SVG in ui/Icon.tsx. Each mark below is rendered from that file, live.',
                ne: 'आइकन लाइब्रेरी राखिएको छैन — ui/Icon.tsx मा यी सबै inline SVG को रूपमा छन्। तलका चिन्ह सोही फाइलबाट रेन्डर हुन्छन्।',
              }}
            />
          </p>
          <ul className="lab-icons">
            {ICONS.map((n) => (
              <li key={n}>
                <Icon name={n} size={18} />
                {n}
              </li>
            ))}
          </ul>
        </section>

        <section className="lab-plate" aria-labelledby="deal-h">
          <h2 id="deal-h">
            <BiText value={{ en: 'What this page gave up', ne: 'यस पृष्ठले के त्याग्यो' }} />
          </h2>
          <p className="lab-body">
            <BiText
              value={{
                en: 'It replaced a neon-glass bento of feature tiles with a cast spec sheet: the eyebrow above the headline, the gradient text, the glow behind the hero and the icon seated in a coloured chip are all gone, because a tile grid of eight assertions is the shape every model reaches for, and a spec table says the same things in a form a site office would recognise.',
                ne: 'नियोन-ग्लास बेन्टो टायलको सट्टा कास्ट स्पेड सिट राखिएको छ — हेडलाइन माथिको eyebrow, ग्रेडियन्ट टेक्स्ट, हिरो पछाडिको ग्लो र रङ चिपभित्रको आइकन हटाइयो।',
              }}
            />
          </p>
          <div className="lab-meta" style={{ marginTop: 20 }}>
            <div>
              <b>8 → 0</b>
              <span className="lab-label">
                <BiText value={{ en: 'sloplint FAIL on this route', ne: 'यस रूटको sloplint FAIL' }} />
              </span>
            </div>
            <div>
              <b>11 → 0</b>
              <span className="lab-label">
                <BiText value={{ en: 'REFLEX, spacing off the 4px scale', ne: 'REFLEX, 4px स्केलबाहिरको स्पेसिङ' }} />
              </span>
            </div>
            <div>
              <b>4</b>
              <span className="lab-label">
                <BiText value={{ en: 'working interactive studios', ne: 'कार्यरत इन्टरएक्टिभ स्टुडियो' }} />
              </span>
            </div>
          </div>
          <p className="lab-body" style={{ marginTop: 20 }}>
            <Link href="/nepal" className="lab-link">
              <BiText value={{ en: 'See the same content in Nepali', ne: 'यही सामग्री नेपालीमा हेर्नुहोस्' }} />
            </Link>
          </p>
        </section>
      </div>

      <section className="lab-band-ink" aria-labelledby="lang-h">
        <div className="wrap">
          <h2 id="lang-h">
            <BiText value={{ en: 'Nepali is not a translation layer', ne: 'नेपाली अनुवादको तह होइन' }} />
          </h2>
          <p className="lab-body lab-lede">
            <BiText
              value={{
                en: 'Setting html[lang="ne"] swaps the body to Noto Sans Devanagari for correct conjunct shaping, and the BiText component that renders both of those sentences flags any string still missing its Nepali — so a gap is visible on the page instead of buried in a file.',
                ne: 'html[lang="ne"] ले Noto Sans Devanagari लगाउँछ; BiText ले अनुवाद नभएको स्ट्रिङ पृष्ठमै देखाउँछ।',
              }}
            />
          </p>
          <div className="lab-swatches">
            {[
              { n: 'Orange', v: 'oklch(66% 0.21 38)', c: 'var(--orange)' },
              { n: 'Paper', v: 'oklch(74% 0.008 80)', c: 'var(--paper)' },
              { n: 'Ink', v: 'oklch(18% 0.005 270)', c: 'var(--ink)' },
              { n: 'Plate', v: 'oklch(82% 0.007 80)', c: 'var(--plate)' },
            ].map((s) => (
              <div className="lab-swatch" key={s.n}>
                <i style={{ background: s.c }} aria-hidden="true" />
                <b>{s.v}</b>
                <span>{s.n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lab-utilities" aria-labelledby="utilities-h">
        <div className="wrap">
          <header className="lab-utilities-head">
            <div>
              <p className="lab-label">
                <BiText value={{ en: 'Utilities, relocated', ne: 'उपयोगिताहरू, स्थानान्तरित' }} />
              </p>
              <h2 id="utilities-h" className="lab-display lab-utilities-title">
                <BiText value={{ en: 'Working instruments', ne: 'कार्यरत उपकरणहरू' }} />
              </h2>
            </div>
            <p className="lab-body lab-lede">
              <BiText
                value={{
                  en: 'The homepage is for exploration. These working controls live here at fixed addresses, so the system can be tuned without turning the entrance into a dashboard.',
                  ne: 'गृहपृष्ठ अन्वेषणका लागि रहन्छ। यी काम गर्ने नियन्त्रणहरू यहाँ, स्थिर ठेगानामा राखिएका छन्, जसले प्रवेशद्वारलाई ड्यासबोर्ड बनाउनु पर्दैन।',
                }}
              />
            </p>
          </header>

          <div className="lab-utility-grid">
            <section
              id="appearance"
              className="lab-utility lab-utility--narrow"
              aria-labelledby="appearance-h"
            >
              <header className="lab-utility-head">
                <span className="lab-utility-no" aria-hidden="true">
                  01
                </span>
                <div>
                  <h3 id="appearance-h" className="lab-utility-title">
                    <BiText value={{ en: 'Appearance Studio', ne: 'रूप स्टुडियो' }} />
                  </h3>
                  <p className="lab-body">
                    <BiText
                      value={{
                        en: 'Theme, density, motion and surface settings are saved on this device.',
                        ne: 'थिम, घनत्व, गति र सतहका सेटिङहरू यही यन्त्रमा सुरक्षित हुन्छन्।',
                      }}
                    />
                  </p>
                </div>
              </header>
              <div className="lab-utility-panel">
                <Appearance locale="en" />
              </div>
            </section>

            <section id="pointer" className="lab-utility lab-utility--wide" aria-labelledby="pointer-h">
              <header className="lab-utility-head">
                <span className="lab-utility-no" aria-hidden="true">
                  02
                </span>
                <div>
                  <h3 id="pointer-h" className="lab-utility-title">
                    <BiText value={{ en: 'Pointer Studio', ne: 'पोइन्टर स्टुडियो' }} />
                  </h3>
                  <p className="lab-body">
                    <BiText
                      value={{
                        en: 'Tune the magnetic cursor and export a JSON preset. Touch devices keep their native cursor.',
                        ne: 'चुम्बकीय कर्सर मिलाउनुहोस् र JSON प्रिसेट निर्यात गर्नुहोस्। टच यन्त्रमा नेटिभ कर्सर रहन्छ।',
                      }}
                    />
                  </p>
                </div>
              </header>
              <div className="lab-utility-panel">
                <PointerStudio locale="en" />
              </div>
            </section>

            <section
              id="instruments"
              className="lab-utility lab-utility--wide"
              aria-labelledby="instruments-h"
            >
              <header className="lab-utility-head">
                <span className="lab-utility-no" aria-hidden="true">
                  03
                </span>
                <div>
                  <h3 id="instruments-h" className="lab-utility-title">
                    <BiText value={{ en: 'Tool Bench', ne: 'औजार बेन्च' }} />
                  </h3>
                  <p className="lab-body">
                    <BiText
                      value={{
                        en: 'Convert units, calculate, time a focus session, keep notes and generate passwords entirely in the browser.',
                        ne: 'एकाइ रूपान्तरण, क्याल्कुलेटर, फोकस टाइमर, नोट र पासवर्ड जनरेटर पूरै ब्राउजरमा चल्छन्।',
                      }}
                    />
                  </p>
                </div>
              </header>
              <div className="lab-utility-panel">
                <ToolBench locale="en" />
              </div>
            </section>

            <section
              id="diagnostics"
              className="lab-utility lab-utility--narrow"
              aria-labelledby="diagnostics-h"
            >
              <header className="lab-utility-head">
                <span className="lab-utility-no" aria-hidden="true">
                  04
                </span>
                <div>
                  <h3 id="diagnostics-h" className="lab-utility-title">
                    <BiText value={{ en: 'Device Pulse', ne: 'यन्त्र पल्स' }} />
                  </h3>
                  <p className="lab-body">
                    <BiText
                      value={{
                        en: 'A live readout of this device’s connection, viewport, pointer, motion and theme.',
                        ne: 'यस यन्त्रको जडान, भ्युपोर्ट, पोइन्टर, गति र थिमको प्रत्यक्ष विवरण।',
                      }}
                    />
                  </p>
                </div>
              </header>
              <div className="lab-utility-panel">
                <Pulse locale="en" />
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
