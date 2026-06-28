// ============================================
// Category-specific onboarding question schema
// One dynamic form (ConsultantCategoryDetailsScreen) renders whichever
// block below matches the consultant's chosen category — adding a new
// category or question is a data change here, not a new screen.
// Answers are stored in consultant_profiles.category_details, keyed by
// each question's `key`.
// ============================================

export type QuestionType = 'chips-multi' | 'chips-single' | 'number' | 'text' | 'boolean';

export interface CategoryQuestion {
  key: string;
  label: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

const TRAVEL_WILLINGNESS = ['Local city only', 'Within state', 'Pan-India', 'International'];

export const CATEGORY_QUESTIONS: Record<string, CategoryQuestion[]> = {
  photographer: [
    {
      key: 'specializations',
      label: 'Photography specializations',
      type: 'chips-multi',
      required: true,
      options: [
        'Wedding', 'Pre-Wedding/Engagement', 'Portrait', 'Fashion', 'Product', 'Food',
        'Real Estate/Architecture', 'Event/Corporate', 'Newborn/Maternity', 'Wildlife/Nature',
        'Sports', 'Street/Documentary',
      ],
    },
    {
      key: 'shootingStyles',
      label: 'Shooting style',
      type: 'chips-multi',
      options: ['Candid', 'Traditional/Posed', 'Documentary', 'Cinematic'],
    },
    { key: 'hasDrone', label: 'Drone/aerial shots available', type: 'boolean' },
    { key: 'hasSecondShooter', label: 'Works with a second shooter/team', type: 'boolean' },
    {
      key: 'deliverables',
      label: "What's included in delivery",
      type: 'chips-multi',
      options: ['Edited Digital Photos', 'RAW Files', 'Printed Album', 'Framed Prints', 'Online Gallery'],
    },
    {
      key: 'editedDeliveryDays',
      label: 'Typical turnaround (days)',
      type: 'number',
      placeholder: 'e.g. 14',
    },
    {
      key: 'travelWillingness',
      label: 'Willing to travel',
      type: 'chips-single',
      options: TRAVEL_WILLINGNESS,
    },
  ],

  videographer: [
    {
      key: 'specializations',
      label: 'Video specializations',
      type: 'chips-multi',
      required: true,
      options: [
        'Wedding Films', 'Corporate/Brand Videos', 'Music Videos', 'Documentary',
        'Event Coverage', 'Product/Ad Videos', 'Social Media Reels',
      ],
    },
    { key: 'hasDrone', label: 'Drone/aerial cinematography', type: 'boolean' },
    { key: 'hasAudioGear', label: 'Dedicated audio gear (lapel/boom mic)', type: 'boolean' },
    {
      key: 'deliverables',
      label: "What's included in delivery",
      type: 'chips-multi',
      options: ['Highlight Reel', 'Full-Length Film', 'Same-Day Edit', 'RAW Footage', 'Social Media Cuts'],
    },
    {
      key: 'editedDeliveryDays',
      label: 'Typical turnaround (days)',
      type: 'number',
      placeholder: 'e.g. 21',
    },
    {
      key: 'travelWillingness',
      label: 'Willing to travel',
      type: 'chips-single',
      options: TRAVEL_WILLINGNESS,
    },
  ],

  designer: [
    {
      key: 'specializations',
      label: 'Design specializations',
      type: 'chips-multi',
      required: true,
      options: [
        'UI/UX Design', 'Branding & Logo', 'Print Design', 'Packaging Design',
        'Illustration', 'Motion Graphics', 'Social Media Creatives',
      ],
    },
    {
      key: 'toolsUsed',
      label: 'Tools used',
      type: 'chips-multi',
      options: ['Figma', 'Photoshop', 'Illustrator', 'Adobe XD', 'CorelDRAW', 'Canva', 'After Effects'],
    },
    {
      key: 'revisionsIncluded',
      label: 'Free revisions included',
      type: 'number',
      placeholder: 'e.g. 2',
    },
    { key: 'sourceFilesIncluded', label: 'Source files included in price', type: 'boolean' },
    {
      key: 'turnaroundDays',
      label: 'Typical turnaround (days)',
      type: 'number',
      placeholder: 'e.g. 7',
    },
  ],

  // Covers painters, sculptors, and illustrators — see migration note on why
  // these stay under one category rather than splitting further.
  sculptor: [
    {
      key: 'mediums',
      label: 'Mediums worked in',
      type: 'chips-multi',
      required: true,
      options: [
        'Oil Painting', 'Acrylic', 'Watercolor', 'Charcoal/Pencil', 'Digital Art', 'Mixed Media',
        'Clay/Terracotta', 'Bronze Casting', 'Wood Carving', 'Stone Carving', 'Metal Work', 'Resin Art',
      ],
    },
    {
      key: 'styles',
      label: 'Artistic styles',
      type: 'chips-multi',
      options: [
        'Realism', 'Abstract', 'Portrait', 'Landscape', 'Surrealism', 'Pop Art',
        'Contemporary', 'Figurative', 'Mural/Wall Art',
      ],
    },
    {
      key: 'commissionTypes',
      label: 'Commission types accepted',
      type: 'chips-multi',
      options: ['Custom Portrait from Photo', 'Original Artwork', 'Mural/On-Site Wall Art', 'Restoration'],
    },
    {
      key: 'typicalSizeRange',
      label: 'Typical size range offered',
      type: 'text',
      placeholder: 'e.g. 12x16 to 36x48 inches',
    },
    { key: 'travelsForOnSite', label: 'Travels for on-site/mural work', type: 'boolean' },
    {
      key: 'turnaroundDays',
      label: 'Typical turnaround (days)',
      type: 'number',
      placeholder: 'e.g. 10',
    },
  ],

  artisan: [
    {
      key: 'craftTypes',
      label: 'Craft types',
      type: 'chips-multi',
      required: true,
      options: [
        'Pottery & Ceramics', 'Embroidery & Textile', 'Jewelry Making', 'Leatherwork', 'Woodwork',
        'Glass Art', 'Candle Making', 'Macrame', 'Handloom Weaving', 'Block Printing',
      ],
    },
    {
      key: 'customizationLevel',
      label: 'Customization level',
      type: 'chips-single',
      options: ['Made-to-Order Only', 'Ready-Made + Custom', 'Ready-Made Only'],
    },
    {
      key: 'materialsNote',
      label: 'Materials/sourcing note',
      type: 'text',
      placeholder: 'e.g. Eco-friendly, handloom cotton (optional)',
    },
    {
      key: 'productionDaysPerPiece',
      label: 'Production time per piece (days)',
      type: 'number',
      placeholder: 'e.g. 5',
    },
    { key: 'bulkOrderCapacity', label: 'Can fulfill bulk/wholesale orders', type: 'boolean' },
  ],
};
