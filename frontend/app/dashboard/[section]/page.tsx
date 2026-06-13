import { notFound } from 'next/navigation';
import { SectionPlaceholder } from '../../../components/section-placeholder';
import { getSectionMeta } from '../../../lib/navigation';

interface SectionPageProps {
  params: {
    section: string;
  };
}

export default function SectionPage({ params }: SectionPageProps) {
  const meta = getSectionMeta(params.section);

  if (!meta) {
    notFound();
  }

  return <SectionPlaceholder section={params.section} />;
}
