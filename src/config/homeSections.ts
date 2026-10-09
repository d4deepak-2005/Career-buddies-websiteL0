export const HOME_SECTIONS = [
  { id: 'hero', label: 'Hero', hint: 'Top banner. Copy edits below.' },
  { id: 'nextStep', label: 'Find your next step', hint: 'Copy, cards, and page links edit below.' },
  { id: 'journey', label: '7-stage journey', hint: 'Copy edits below.' },
  { id: 'plans', label: 'Career plans', hint: 'Plans come from Catalog.' },
  { id: 'masterclasses', label: 'Live masterclasses', hint: 'Heading edits below. Hidden when no live webinar.' },
  { id: 'checkIn', label: 'Career check-in', hint: 'Banner copy edits below.' },
  { id: 'services', label: 'Services / tracks', hint: 'Heading edits below. Cards come from Catalog.' },
  { id: 'mentors', label: 'Mentors', hint: 'Items come from People.' },
  { id: 'leadership', label: 'Leadership', hint: 'People → Leadership.' },
  { id: 'story', label: 'Brand story teaser', hint: 'Show or hide only.' },
  { id: 'trust', label: 'Why Trust CareerBuddies', hint: 'Copy edits below.' },
  { id: 'faq', label: 'FAQ', hint: 'Heading and questions edit below.' },
  { id: 'cta', label: 'Final call to action', hint: 'Show or hide only.' },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]['id'];

export function defaultSectionVisibility(): Record<HomeSectionId, boolean> {
  return Object.fromEntries(HOME_SECTIONS.map((section) => [section.id, true])) as Record<HomeSectionId, boolean>;
}

export function isHomeSectionOn(
  home: { sectionVisibility?: Partial<Record<string, boolean>> } | null | undefined,
  id: HomeSectionId
): boolean {
  return home?.sectionVisibility?.[id] !== false;
}

export type HomeHtmlBlock = { enabled: boolean; html: string };

export function defaultHomeHtml(): Record<HomeSectionId, HomeHtmlBlock> {
  return Object.fromEntries(HOME_SECTIONS.map((section) => [section.id, { enabled: false, html: '' }])) as Record<
    HomeSectionId,
    HomeHtmlBlock
  >;
}

export function homeSectionHtml(
  home: { homeHtml?: Partial<Record<string, HomeHtmlBlock>> } | null | undefined,
  id: HomeSectionId
): string {
  const block = home?.homeHtml?.[id];
  if (!block?.enabled) return '';
  return (block.html || '').trim();
}
