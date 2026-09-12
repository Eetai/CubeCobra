import CardType from '@utils/datatypes/Card';

/**
 * Ways to display the drafted pool (mainboard + sideboard) beneath/above the
 * pack. `stacks` is the original interactive drag-and-drop card stacks; the rest
 * are lighter, display-only summaries.
 */
export const FIELD_VIEWS = ['stacks', 'list', 'chips', 'grid', 'collapse'] as const;

export type FieldView = (typeof FIELD_VIEWS)[number];

export const FIELD_VIEW_META: Record<FieldView, { label: string; blurb: string; icon: string }> = {
  stacks: { label: 'Card Stacks', blurb: 'Draggable image stacks', icon: '🃏' },
  list: { label: 'Text List', blurb: 'Names grouped by CMC', icon: '≡' },
  chips: { label: 'Color Chips', blurb: 'Name chips by color', icon: '🏷' },
  grid: { label: 'Thumbnail Grid', blurb: 'Small non-overlapping cards', icon: '▦' },
  collapse: { label: 'Collapsible', blurb: 'Just titled bars', icon: '▸' },
};

// The flat display-only views all take the same shape: the resolved cards for
// each zone (mainboard/sideboard) in pick/placement order.
export interface FlatFieldProps {
  mainboard: CardType[];
  sideboard: CardType[];
}

/**
 * Where the draft pool sits relative to the pack. `auto` defers to the variant's
 * own preference (Arena-family variants want it on top); the others force a
 * position for any variant.
 */
export const POOL_POSITIONS = ['auto', 'bottom', 'top', 'right'] as const;

export type PoolPosition = (typeof POOL_POSITIONS)[number];

export const POOL_POSITION_META: Record<PoolPosition, { label: string; blurb: string; icon: string }> = {
  auto: { label: 'Auto', blurb: "Follow the variant's default", icon: '✦' },
  bottom: { label: 'Under Draft', blurb: 'Pool below the pack', icon: '▽' },
  top: { label: 'On Top', blurb: 'Pool above the pack', icon: '△' },
  right: { label: 'On Right', blurb: 'Pool beside the pack', icon: '▷' },
};
