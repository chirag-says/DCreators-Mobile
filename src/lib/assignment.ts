/**
 * Assignment vocabulary and title resolution.
 *
 * A project carries three overlapping strings and the UI kept picking a
 * different one on each screen, which is how the consultant ended up staring
 * at "Hire Designer / Hire Designer" with no idea what the job actually was:
 *
 *   assignment_type     "Hire Designer"  — the ROLE. The consultant already
 *                                          knows their own role; never a title.
 *   assignment_details  ["Logo Design"]  — the CREATIVE ITEM. This is the title.
 *   assignment_brief    "logo Design"    — free text the client typed.
 *
 * CREATIVE_ITEMS_BY_CATEGORY is the single source of truth for what can be
 * commissioned. Before this it existed three times over — ConsultantService
 * PricingScreen's SERVICE_ITEMS, the since-deleted HireConsultantScreen's own
 * role-keyed map, and a flat list here — so a client could ask for something no consultant in
 * that category prices. The pricing screen's list wins because it is the one
 * consultants actually set fees against (consultant_service_pricing rows key
 * off these exact strings); changing the wording here orphans those rows.
 */

/** DB values of `consultant_profiles.category` / `bid_requests.category`. */
export type AssignmentCategory =
  | 'designer' | 'photographer' | 'videographer' | 'sculptor' | 'artisan';

export const CATEGORY_ORDER: AssignmentCategory[] = [
  'designer', 'photographer', 'videographer', 'sculptor', 'artisan',
];

/** Client-facing label. "Artist" reads better than "Sculptor" to a buyer. */
export const CATEGORY_LABELS: Record<AssignmentCategory, string> = {
  designer: 'Designer',
  photographer: 'Photographer',
  videographer: 'Videographer',
  sculptor: 'Artist',
  artisan: 'Artisan',
};

/**
 * What each category can actually be commissioned for.
 *
 * NOTE: the `designer` list carries four photography entries
 * ("Academic event photography", "Architectural Photography",
 * "Birthday photography", "Accessories & Jewelleries (terracotta)") inherited
 * verbatim from SERVICE_ITEMS. They look like copy-paste, but consultants may
 * already have priced them, so they are preserved rather than silently
 * dropped. Removing them is a one-line change once that is confirmed.
 */
export const CREATIVE_ITEMS_BY_CATEGORY: Record<AssignmentCategory, string[]> = {
  designer: [
    'Academic event photography',
    'Accessories & Jewelleries (terracotta)',
    'App design',
    'Architectural Photography',
    'Birthday photography',
    'Brand identity design',
    'Brochure design',
    'Logo design',
    'Poster design',
    'Social media design',
    'UI/UX design',
    'Website design',
  ],
  photographer: [
    'Academic event photography',
    'Architectural Photography',
    'Birthday photography',
    'Corporate photography',
    'Fashion photography',
    'Food photography',
    'Product photography',
    'Wedding photography',
    'Wildlife photography',
  ],
  videographer: [
    'Corporate video',
    'Drone coverage',
    'Event coverage',
    'Music video',
    'Same-day edit',
    'Social media reel',
    'Wedding film',
  ],
  sculptor: [
    'Abstract sculpture',
    'Bronze casting',
    'Clay modelling',
    'Installation art',
    'Metal sculpture',
    'Stone carving',
    'Terracotta work',
    'Wood carving',
  ],
  artisan: [
    'Accessories & Jewelleries (terracotta)',
    'Ceramic work',
    'Fabric printing',
    'Hand embroidery',
    'Leather craft',
    'Macramé',
    'Paper craft',
    'Pottery',
    'Weaving',
    'Wooden craft',
  ],
};

/** Roles a client can hire for, in the same order as the categories. */
export const HIRE_ROLES = [
  'Hire Creative Consultant',
  'Hire Designer',
  'Hire Photographer',
  'Hire Videographer',
  'Hire Sculptor',
  'Hire Artisan',
] as const;

/**
 * Which catalogue a hire role draws from. "Creative Consultant" is the generic
 * entry point and maps to design work, matching what it has always offered.
 */
const ROLE_TO_CATEGORY: Record<string, AssignmentCategory> = {
  'Hire Creative Consultant': 'designer',
  'Hire Designer': 'designer',
  'Hire Photographer': 'photographer',
  'Hire Videographer': 'videographer',
  'Hire Sculptor': 'sculptor',
  'Hire Artisan': 'artisan',
};

export function categoryForRole(role: string | null | undefined): AssignmentCategory {
  return ROLE_TO_CATEGORY[role ?? ''] ?? 'designer';
}

/**
 * Items for a category. Accepts the raw DB string and tolerates unknown or
 * missing values by returning an empty list, so a screen renders "pick a
 * category first" rather than a misleading full catalogue.
 */
export function creativeItemsFor(category: string | null | undefined): string[] {
  if (!category) return [];
  const key = category.toLowerCase() as AssignmentCategory;
  return CREATIVE_ITEMS_BY_CATEGORY[key] ?? [];
}

const TITLE_MAX = 60;

/** Collapse a free-text brief into something that can sit on one line. */
function briefAsTitle(brief: string | null | undefined): string | null {
  if (!brief) return null;
  const firstLine = brief.split('\n')[0].trim();
  if (!firstLine) return null;
  return firstLine.length > TITLE_MAX
    ? `${firstLine.slice(0, TITLE_MAX - 1).trimEnd()}…`
    : firstLine;
}

/**
 * The one place that decides what an assignment is called. Every surface that
 * shows a project name calls this so the consultant sees the same string on the
 * dashboard card, the detail screen, the work order, payment and history.
 */
export function getAssignmentTitle(project: {
  assignment_details?: string[] | null;
  assignment_brief?: string | null;
  assignment_type?: string | null;
} | null | undefined): string {
  if (!project) return 'Creative Project';

  const item = project.assignment_details?.[0]?.trim();
  if (item) return item;

  const fromBrief = briefAsTitle(project.assignment_brief);
  if (fromBrief) return fromBrief;

  return project.assignment_type?.trim() || 'Creative Project';
}
