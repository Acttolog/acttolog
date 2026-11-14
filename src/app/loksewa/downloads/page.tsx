import type { Metadata } from 'next';
import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { FxScene } from '@/components/fx/Motion';
import { dlFind, dlFiles, dlMb, dlSum, paidFiles, type DlFile } from '@/lib/dl';
import {
  loksewaCounts,
  loksewaDocTitles,
  loksewaMeta,
  loksewaPapers,
  loksewaPaperCounts,
  loksewaPlan,
  loksewaPractice,
  loksewaTotals,
} from '@/lib/content/loksewa';
import { getDB } from '@/lib/content';

const meta = loksewaMeta();
const files = dlFiles();
const totals = loksewaTotals();
const counts = loksewaCounts();

export const metadata: Metadata = {
  title: 'लोकसेवा घर — डाउनलोड केन्द्र (PDF, स्लाइड, भिडियो)',
  description:
    'पाठ्यक्रम नक्सा, फोल्डर चेकलिस्ट, हप्तागत योजना, कानून सूची, नमुना प्रश्नपत्र र परिचयात्मक भिडियो — निःशुल्क PDF डाउनलोड गर्नुहोस् वा छाप्नुहोस्। पेपर प्याक स्लाइडसहित रु. ३००, चारै पेपर रु. ६००।',
  alternates: { canonical: '/loksewa/downloads' },
  openGraph: {
    title: 'लोकसेवा घर — Download centre: syllabus PDFs, checklists, slides, orientation video',
    description:
      'Free printable and downloadable study documents for the Nepal Section Officer exam, built from the published syllabus, plus paper packs with teaching slides.',
    url: '/loksewa/downloads',
    type: 'website',
    images: [{ url: '/media/og-home.jpg', width: 1200, height: 630 }],
  },
};

interface Entry {
  file: string;
  doc: string;
  title: string;
  en: string;
  desc: string;
  meta: string;
}

/** Free catalogue. Every row is joined against a file that exists on disk. */
const FREE: Entry[] = [
  {
    file: 'full.pdf',
    doc: 'full',
    title: 'सम्पूर्ण पाठ्यक्रम नक्सा',
    en: 'Complete syllabus map',
    desc: 'चारै पेपर, सबै विषय, फोल्डर र बुँदा — चरण-अङ्क तालिकासहित एउटै कागजमा।',
    meta: `${counts.papers} पेपर · ${counts.subjects} विषय · ${counts.folders} फोल्डर · ${counts.points} बुँदा`,
  },
  ...loksewaPapers().map((p) => {
    const c = loksewaPaperCounts(p.slug);
    return {
      file: `${p.slug}.pdf`,
      doc: p.slug,
      title: `${p.title.ne} — पाठ्यक्रम र चेकलिस्ट`,
      en: `${p.title.en} — syllabus and checklist`,
      desc: p.strategy.ne,
      meta: `${c.subjects} विषय · ${c.folders} फोल्डर · ${c.points} बुँदा`,
    };
  }),
  {
    file: 'planner.pdf',
    doc: 'planner',
    title: 'बाह्र हप्ताको योजना र चेकलिस्ट',
    en: 'Twelve-week plan and folder checklist',
    desc: 'फोल्डर गनेर बाँडिएको सुझाव योजना, हरेक हप्ताको हस्ताक्षर ठाउँ र सबै फोल्डरको दोहोरो पठन चेकलिस्ट।',
    meta: `${loksewaPlan().weeks.length} हप्ता · ${counts.folders} चेकबक्स`,
  },
  {
    file: 'laws.pdf',
    doc: 'laws',
    title: 'कानून दस्तावेज पढ्ने सूची',
    en: 'Law documents reading list',
    desc: 'कुन कानून किन पढ्ने र कुन आधिकारिक पोर्टलबाट पढ्ने — तालिका ढाँचामा।',
    meta: `${counts.laws} कानून · ४ आधिकारिक स्रोत`,
  },
  {
    file: 'practice.pdf',
    doc: 'practice',
    title: 'नमुना प्रश्नपत्र र उत्तर कुञ्जी',
    en: 'Model question paper with answer key',
    desc: 'वस्तुगत ढाँचामा लेखिएका अभ्यास प्रश्न, पल्टाएर जाँच्ने कुञ्जी र हरेक उत्तरको व्याख्या।',
    meta: `${counts.questions} प्रश्न · −२०% नकारात्मक`,
  },
];

const PAID = loksewaPapers().map((p) => ({
  slug: p.slug,
  color: p.color,
  title: p.title.ne,
  en: p.title.en,
  file: `slides-${p.slug}.pptx`,
  offer: `loksewa-pack-${p.slug}`,
  count: loksewaPaperCounts(p.slug),
}));

export default function LoksewaDownloadsPage() {
  const db = getDB();
  const paid = paidFiles();
  const free = FREE.map((e) => ({ ...e, built: dlFind(e.file, files) })).filter(
    (e): e is Entry & { built: DlFile } => e.built !== null,
  );
  const missing = FREE.filter((e) => !dlFind(e.file, files)).map((e) => e.file);
  const video = dlFind('orientation.mp4', files);
  const poster = dlFind('orientation.jpg', files);
  const decks = PAID.map((p) => ({ ...p, built: paid.find((f) => f.name === p.file) ?? null }));
  const freeBytes = dlSum(free.map((f) => f.built));
  const paidBytes = dlSum(paid);

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="lkd-hero" id="lkd-top">
        <div className="lkd-hero-grid" aria-hidden="true">
          {loksewaPapers().map((p) => (
            <span key={p.slug} className="lkd-tile" style={{ '--c': p.color } as React.CSSProperties} />
          ))}
        </div>
        <div className="wrap lkd-hero-in">
          <div className="lkd-crumb">
            <Link href="/loksewa">
              <Icon name="arrow" size={13} /> लोकसेवा घर
            </Link>
          </div>
          <h1 className="lkd-h1">
            डाउनलोड केन्द्र
            <span className="lkd-h1-en">Downloads &amp; print</span>
          </h1>
          <p className="lkd-lead">
            {free.length} वटा कागजात निःशुल्क — PDF तुरुन्तै खोल्नुहोस्, डाउनलोड गर्नुहोस् वा छाप्नुहोस्। स्लाइड
            प्याकसहितको पेपर प्याक रु. ३००, चारै पेपरको पूर्ण प्याक रु. ६००।
          </p>
          <p className="lkd-lead-en">
            {free.length} documents free — open, download or print the PDFs. Paper packs with teaching slides are
            NPR 300 each; the full four-paper house pack is NPR 600.
          </p>
          <div className="lkd-stats">
            <span>
              <b>{free.length}</b> निःशुल्क फाइल
            </span>
            <span>
              <b>{dlMb(freeBytes)}</b> डाटा
            </span>
            <span>
              <b>{totals.all}</b> अङ्कको नक्सा
            </span>
            <span>
              <b>{counts.folders}</b> फोल्डर
            </span>
          </div>
          <div className="lkd-hero-cta">
            <a className="btn btn-p btn-lg" href="#lkd-free">
              <Icon name="down" size={16} /> निःशुल्क PDF लिनुहोस्
            </a>
            {video ? (
              <a className="btn btn-g btn-lg" href="#lkd-video">
                <Icon name="play" size={16} /> परिचय भिडियो
              </a>
            ) : null}
            <a className="btn btn-lg" href="#lkd-paid">
              पेपर प्याक <Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── FREE PDFs ────────────────────────────────────────────── */}
      <section className="sec lksec" id="lkd-free">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">निःशुल्क कागजात — तुरुन्त डाउनलोड वा प्रिन्ट</h2>
            <p className="lead mt-4">
              खाता चाहिँदैन, इमेल चाहिँदैन। हरेक फाइल यही साइटको विषसूची डाटाबाट बनेको छ, त्यसैले साइटमा जे छ त्यही
              कागजमा हुन्छ।
            </p>
          </Reveal>
          <FxScene>
            <div className="lkd-grid">
              {free.map((f, i) => (
                <Reveal key={f.file} delay={i * 30} fx={i === 0 ? 'tilt scan' : undefined}>
                  <article className="lkd-card fx-holo" data-kind={f.built.kind}>
                    <div className="lkd-card-top">
                      <span className="lkd-fmt mono">{f.built.kind.toUpperCase()}</span>
                      <span className="lkd-size mono">{dlMb(f.built.bytes)}</span>
                      <span className="lkd-tagfree">निःशुल्क</span>
                    </div>
                    <h3 className="lkd-card-t">{f.title}</h3>
                    <p className="lkd-card-en">{f.en}</p>
                    <p className="lkd-card-d">{f.desc}</p>
                    <p className="lkd-card-m mono">{f.meta}</p>
                    <div className="lkd-card-act">
                      <a className="btn btn-p btn-sm" href={f.built.path} download={f.built.name}>
                        <Icon name="down" size={14} /> डाउनलोड
                      </a>
                      <Link className="btn btn-sm" href={`/loksewa/print/${f.doc}`}>
                        <Icon name="screen" size={14} /> खोल्नुहोस् / छाप्नुहोस्
                      </Link>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </FxScene>
          {missing.length > 0 ? (
            <p className="lkd-warn">
              <Icon name="spark" size={14} /> केही फाइल अझै बनेका छैनन्: {missing.join(', ')} — तिनो प्रिन्ट संस्करण
              माथिको लिङ्कबाट तुरुन्तै छापिन सक्छ।
            </p>
          ) : null}
        </div>
      </section>

      {/* ── VIDEO ────────────────────────────────────────────────── */}
      {video ? (
        <section className="sec lksec" id="lkd-video">
          <div className="wrap">
            <Reveal>
              <h2 className="h2">परीक्षा एक नजरमा — ४० सेकेन्डको परिचय</h2>
              <p className="lead mt-4">
                सात चरण, {totals.all} अङ्क, चार पेपर र {counts.folders} फोल्डर कता जानुपर्छ — यही बाटो छोटो भिडियोमा।
              </p>
            </Reveal>
            <Reveal delay={50}>
              <div className="lkd-player">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={poster ? poster.path : undefined}
                  aria-label="लोकसेवा घर परिचयात्मक भिडियो — शाखा अधिकृत तहको संरचना"
                >
                  <source src={video.path} type="video/mp4" />
                  तपाईंको ब्राउजरले MP4 चलाउँदैन —{' '}
                  <a href={video.path} download={video.name}>
                    भिडियो डाउनलोड गर्नुहोस्
                  </a>
                  ।
                </video>
                <div className="lkd-player-meta">
                  <div>
                    <b>{dlMb(video.bytes)}</b> MP4 · 1280×720
                  </div>
                  <p>
                    यो भिडियो ACTTOLOG ले साइटकै तथ्याङ्कबाट मोशन ग्राफिक्समा बनाएको हो — कुनै वास्तविक कक्षाको
                    रेकर्डिङ होइन, र पछाडि सानो सिन्थ साउन्ड बेड मात्र छ।
                  </p>
                  <a className="btn btn-g btn-sm" href={video.path} download={video.name}>
                    <Icon name="down" size={14} /> भिडियो लिनुहोस्
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ── PAID PACKS ───────────────────────────────────────────── */}
      <section className="sec lksec" id="lkd-paid">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">पेपर प्याक — पढाइ स्लाइडसहित</h2>
            <p className="lead mt-4">
              एउटा पेपरको प्याक रु. ३००, चारै पेपरको पूर्ण प्याक रु. ६००। प्याकमा के-के आउँछ भन्ने तल नापसहित
              लेखिएको छ।
            </p>
          </Reveal>
          <div className="lkd-paid">
            {decks.map((d, i) => (
              <Reveal key={d.slug} delay={i * 35}>
                <article className="lkd-pack" style={{ '--c': d.color } as React.CSSProperties}>
                  <div className="lkd-pack-head">
                    <span className="lkd-pack-num mono">०{i + 1}</span>
                    <h3>{d.title}</h3>
                  </div>
                  <p className="lkd-pack-en">{d.en}</p>
                  <ul className="lkd-pack-list">
                    <li>
                      <Icon name="check" size={13} /> <b>{d.count.subjects}</b> विषयको PPTX स्लाइड डेक{' '}
                      {d.built ? (
                        <em className="mono">{dlMb(d.built.bytes)} · भुक्तानीपछि पठाइन्छ</em>
                      ) : (
                        <em className="mono">तयार भैरहेको</em>
                      )}
                    </li>
                    <li>
                      <Icon name="check" size={13} /> {d.count.folders} फोल्डरको प्रिन्ट चेकलिस्ट (PDF)
                    </li>
                    <li>
                      <Icon name="check" size={13} /> {d.count.points} बुँदाको पठान पाना (PDF)
                    </li>
                    <li>
                      <Icon name="check" size={13} />{' '}
                      {loksewaPractice(d.slug).length > 0
                        ? `नमुना ${loksewaPractice(d.slug).length} प्रश्न + उत्तर कुञ्जी`
                        : 'आयोगको नमुना प्रश्नपत्र खोज्ने स्रोत सूची'}
                    </li>
                  </ul>
                  <div className="lkd-pack-foot">
                    <span className="lkd-price">
                      रु. ३०० <em>≈ $3</em>
                    </span>
                    <Link className="btn btn-p btn-sm" href={`/offers/${d.offer}`}>
                      अर्डर दिनुहोस् <Icon name="arrow" size={14} />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
            <Reveal delay={140}>
              <article className="lkd-pack lkd-pack-full">
                <div className="lkd-pack-head">
                  <span className="lkd-pack-num mono">★</span>
                  <h3>पूर्ण प्याक — चारै पेपर</h3>
                </div>
                <p className="lkd-pack-en">Full house pack — all four papers</p>
                <ul className="lkd-pack-list">
                  <li>
                    <Icon name="check" size={13} /> चारै स्लाइड डेक ({dlMb(paidBytes)})
                  </li>
                  <li>
                    <Icon name="check" size={13} /> सम्पूर्ण पाठ्यक्रम नक्सा + बाह्र हप्ता योजना
                  </li>
                  <li>
                    <Icon name="check" size={13} /> कानून सूची र पूरा नमुना प्रश्नपत्र ({counts.questions} प्रश्न)
                  </li>
                  <li>
                    <Icon name="check" size={13} /> परिचयात्मक भिडियो फाइल
                  </li>
                </ul>
                <div className="lkd-pack-foot">
                  <span className="lkd-price">
                    रु. ६०० <em>≈ $5</em>
                  </span>
                  <Link className="btn btn-p btn-sm" href="/offers/loksewa-pack-full">
                    अर्डर दिनुहोस् <Icon name="arrow" size={14} />
                  </Link>
                </div>
              </article>
            </Reveal>
          </div>
          <Reveal>
            <div className="lkd-how">
              <Icon name="shield" size={15} />
              <p>
                <b>भुक्तानी कसरी?</b> यो साइटमा अझै अनलाइन भुक्तानी प्रदायक प्रमाणीकृत छैन। त्यसैले अर्डर सम्पर्क
                फारमबाट आउँछ, भुक्तानीको तरिका मिलेर टुङ्गिन्छ र फाइल पुष्टिपछि पठाइन्छ — कुनै पनि भुक्तानी
                प्रदायकको पुष्टि बिना &quot;सफल&quot; भनिँदैन। निःशुल्क PDF मा यस्तो कुनै पर्ख हुँदैन।
                <br />
                <b>पेड फाइल यो साइटमा राखिएको छैन।</b> स्लाइड डेकहरू प्रकाशन फोल्डरबाहिर बन्छन्, त्यसैले
                ब्राउजरबाट सिधै झिक्न मिल्दैन — तपाईंको अर्डर पुष्टि भएपछि मात्र पठाइन्छ।
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PRINT STRIP ──────────────────────────────────────────── */}
      <section className="sec lksec" id="lkd-print">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">इन्टरनेट कम भए पनि छाप्न सकिन्छ</h2>
            <p className="lead mt-4">
              प्रिन्ट संस्करणमा मेनु, बटन र रङ्ग हट्छन् — कालो-सेतो A4 मा सक्दो धेरै बुँदा आउँछन्। फोनबाट पनि
              ब्राउजरको &quot;Print → Save as PDF&quot; ले उही कागज दिन्छ।
            </p>
          </Reveal>
          <Reveal delay={40}>
            <div className="lkd-docs">
              {Object.entries(loksewaDocTitles()).map(([slug, t]) => (
                <Link key={slug} className="lkd-doc" href={`/loksewa/print/${slug}`}>
                  <Icon name="doc" size={14} /> {t.ne}
                  <em>{t.en}</em>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CLOSE ────────────────────────────────────────────────── */}
      <section className="sec lksec lkd-close">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">यी फाइल कहाँबाट आउँछन्</h2>
            <p className="lead mt-4">
              सबै कागज यही घरमा भएको विषसूची डाटाबाट बन्छ — साइटमा जे छ, कागजमा त्यही। कानूनको अन्तिम पाठ
              आधिकारिक स्रोतबाटै पढ्नुहोस्; यो सूची पढ्ने बाटो हो, कानूनको प्रति होइन।
            </p>
            <p className="lkd-total">
              जम्मा डाटा: <b>{dlMb(dlSum(files))}</b> · {files.length} फाइल · {meta.updatedSeason.ne}
            </p>
            <div className="lkd-close-cta">
              <Link className="btn btn-p btn-lg" href="/loksewa">
                <Icon name="layers" size={16} /> पूरा घर खोल्नुहोस्
              </Link>
              <Link className="btn btn-g btn-lg" href="/loksewa/explorer">
                <Icon name="globe" size={16} /> ३डी एक्सप्लोरर
              </Link>
              <a className="btn btn-lg" href={`mailto:${db.settings.email}`}>
                <Icon name="mail" size={16} /> केही सोध्नुहोस्
              </a>
            </div>
            <p className="lk-disclaimer">{meta.disclaimer.ne}</p>
            <p className="lk-disclaimer lk-disclaimer-en">{meta.disclaimer.en}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
