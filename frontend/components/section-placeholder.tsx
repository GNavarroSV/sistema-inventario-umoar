import { getSectionMeta } from '../lib/navigation';

interface SectionPlaceholderProps {
  section: string;
}

export function SectionPlaceholder({ section }: SectionPlaceholderProps) {
  const meta = getSectionMeta(section);

  return (
    <section className="section-page">
      <div className="section-card">
        <p className="eyebrow">{meta?.eyebrow ?? 'Modulo'}</p>
        <h2>{meta?.title ?? 'Seccion'}</h2>
        <p>{meta?.description ?? 'Esta seccion esta lista para integrarse con datos reales.'}</p>
      </div>
    </section>
  );
}
