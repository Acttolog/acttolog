import type { Metadata } from 'next';
import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { SyllabusExplorer } from '@/components/loksewa/SyllabusExplorer';
import { loksewaCounts, loksewaMeta, loksewaPapers, loksewaTotals } from '@/lib/content/loksewa';

const meta = loksewaMeta();
const totals = loksewaTotals();
const counts = loksewaCounts();

export const metadata: Metadata = {
  title: 'पाठ्यक्रम ३डी एक्सप्लोरर — लोकसेवा घर',
  description:
    'शाखा अधिकृत तहको पाठ्यक्रम घुमाएर हेर्नुहोस्: चार पेपर, १७ विषय र ५७ फोल्डर — हरेक नोडबाट विषय पाना र प्रिन्ट PDF सम्म।',
  alternates: { canonical: '/loksewa/explorer' },
  openGraph: {
    title: 'Loksewa syllabus in 3D — explore every paper, subject and folder',
    description:
      'A spatial navigator for the Nepal Section Officer syllabus: rotate the four papers, open a subject, read its folders, and take the printable map.',
    url: '/loksewa/explorer',
    type: 'website',
    images: [{ url: '/media/og-home.jpg', width: 1200, height: 630 }],
  },
};

export default function LoksewaExplorerPage() {
  const papers = loksewaPapers();

  return (
    <>
      <section className="lxp-hero">
        <div className="wrap">
          <div className="lxp-crumb">
            <Link href="/loksewa">
              <Icon name="arrow" size={13} /> लोकसेवा घर
            </Link>
            <Link href="/loksewa/downloads">
              डाउनलोड केन्द्र <Icon name="arrow" size={13} />
            </Link>
          </div>
          <h1 className="lxp-h1">
            पाठ्यक्रम एक्सप्लोरर
            <span className="lxp-h1-en">Three dimensions, {counts.folders} folders</span>
          </h1>
          <p className="lxp-lead">
            घुमाउनुहोस्, पेपर खोल्नुहोस्, विषयमा पस्नुहोस् — हरेक नोड सिधै पढाइ पाना र प्रिन्ट हुने PDF मा जान्छ।
          </p>
          <p className="lxp-lead-en">
            Rotate the ring, open a paper, step into a subject. Every node links straight to its study page and its
            printable map.
          </p>
        </div>
        <SyllabusExplorer papers={papers} allMarks={totals.all} />
      </section>

      <section className="sec lksec" id="lxp-index">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">सूचीमा पनि — खोज्न सजिलो</h2>
            <p className="lead mt-4">
              एक्सप्लोररको उही संरचना यहाँसम flat छ: पेपर → विषय → फोल्डर → पढ्नुपर्ने बुँदा। मोबाइलमा वा
              प्रिन्ट गर्दा यही सूची उपयोगी पर्छ।
            </p>
          </Reveal>
          <div className="lxp-index">
            {papers.map((p, i) => (
              <Reveal key={p.slug} delay={i * 30}>
                <div className="lxp-paper" style={{ '--c': p.color } as React.CSSProperties}>
                  <div className="lxp-paper-head">
                    <span className="mono">०{i + 1}</span>
                    <Link href={`/loksewa/${p.slug}`}>{p.title.ne}</Link>
                    <em>{p.title.en}</em>
                  </div>
                  <ul className="lxp-subjects">
                    {p.subjects.map((s) => (
                      <li key={s.slug}>
                        <Link className="lxp-subject" href={`/loksewa/${p.slug}/${s.slug}`}>
                          {s.title.ne}
                          <em>{s.units.length} फोल्डर</em>
                        </Link>
                        <ul className="lxp-folders">
                          {s.units.map((u) => (
                            <li key={u.slug}>
                              <Link href={`/loksewa/${p.slug}/${s.slug}`}>{u.title.ne}</Link>
                              <span className="mono">{u.points.length}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                  <div className="lxp-paper-foot">
                    <Link href={`/loksewa/print/${p.slug}`}>
                      <Icon name="doc" size={13} /> यस पेपरको नक्सा (PDF)
                    </Link>
                    <Link href={`/offers/loksewa-pack-${p.slug}`}>
                      <Icon name="down" size={13} /> पेपर प्याक — रु. ३००
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="lk-disclaimer">{meta.disclaimer.ne}</p>
          <p className="lk-disclaimer lk-disclaimer-en">{meta.disclaimer.en}</p>
        </div>
      </section>
    </>
  );
}
