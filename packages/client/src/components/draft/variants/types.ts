import CardType from '@utils/datatypes/Card';

/**
 * The available draft UI variants. Kept as a const tuple so the switcher can
 * iterate them and TS can derive the union type.
 *
 * The `arena`/`arc`/`rail` trio are the Arena family: a splayed hand along the
 * bottom with the draft pool (deck stacks) above it. They share one base
 * component and differ only in fan geometry.
 */
export const DRAFT_VARIANTS = ['classic', 'arena', 'arc', 'grid', 'tier'] as const;

export type DraftVariant = (typeof DRAFT_VARIANTS)[number];

export interface VariantMeta {
  label: string;
  blurb: string;
  icon: string;
  // Arena-family variants render the draft pool above the pack and animate their
  // own pack turnover, so the page swaps the layout and the dispatcher skips its
  // loading spinner for them.
  poolOnTop?: boolean;
}

export const DRAFT_VARIANT_META: Record<DraftVariant, VariantMeta> = {
  classic: { label: 'Classic Pro', blurb: 'Polished responsive grid', icon: '▦' },
  arena: { label: 'Arena Fan', blurb: 'Wide fanned hand', icon: '🎴', poolOnTop: true },
  arc: { label: 'Arena Arc', blurb: 'Deep curved hand', icon: '⌒', poolOnTop: true },
  grid: { label: 'Arena Grid', blurb: 'Fit-to-window tiles', icon: '⊞', poolOnTop: true },
  tier: { label: 'Tier Ranker', blurb: 'Bot-rating power ranking', icon: '📊' },
};

/**
 * Uniform prop contract shared by every variant. The dispatcher (DraftPackView)
 * fills these in from CubeDraftPage's existing handlers so a variant never needs
 * to know anything about draft state, bots, or persistence.
 *
 * - commit(index) makes the pick/trash for the card at that pack index. It is
 *   already the correct action for the current step (pick vs trash).
 * - showRatings mirrors the shared "Show Bot Ratings" toggle in the header.
 */
export interface VariantProps {
  pack: CardType[];
  ratings?: number[];
  maxRating: number;
  showRatings: boolean;
  loading: boolean;
  disabled: boolean;
  isTrashStep: boolean;
  commit: (index: number) => void;
}
