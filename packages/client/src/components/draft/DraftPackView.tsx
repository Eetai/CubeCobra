import React, { useEffect, useMemo, useState } from 'react';

import CardType from '@utils/datatypes/Card';

import { Card, CardBody, CardHeader } from '../base/Card';
import Button from '../base/Button';
import Text from '../base/Text';
import { ArenaArc, ArenaFan, ArenaGrid } from './variants/ArenaSplay';
import ClassicPro from './variants/ClassicPro';
import TierRanker from './variants/TierRanker';
import { DRAFT_VARIANT_META, DraftVariant, VariantProps } from './variants/types';

interface DraftPackViewProps {
  variant: DraftVariant;
  pack: CardType[];
  loading: boolean;
  disabled: boolean;
  title: string;
  ratings?: number[];
  error?: boolean;
  onRetry?: () => void;
  retryInProgress?: boolean;
  isTrashStep: boolean;
  onPick: (index: number) => void;
  onTrash: (index: number) => void;
  headerActions?: React.ReactNode;
}

const VARIANT_COMPONENTS: Record<DraftVariant, React.FC<VariantProps>> = {
  classic: ClassicPro,
  arena: ArenaFan,
  arc: ArenaArc,
  grid: ArenaGrid,
  tier: TierRanker,
};

/**
 * Presentation dispatcher for the draft pack. Owns the shared chrome (title,
 * ratings toggle, loading/error handling) and renders the selected variant with
 * a uniform prop contract. All draft logic stays in CubeDraftPage; picking is
 * funneled through commit(index) which is already the correct step action.
 */
const DraftPackView: React.FC<DraftPackViewProps> = ({
  variant,
  pack,
  loading,
  disabled,
  title,
  ratings,
  error = false,
  onRetry,
  retryInProgress = false,
  isTrashStep,
  onPick,
  onTrash,
  headerActions,
}) => {
  // The Tier variant is all about ratings, so it reveals them by default.
  const [showRatings, setShowRatings] = useState(variant === 'tier');

  // Reset the reveal whenever a new pack arrives, except where the variant
  // inherently shows ratings.
  useEffect(() => {
    setShowRatings(variant === 'tier');
  }, [pack, variant]);

  const maxRating = useMemo(() => (ratings && ratings.length > 0 ? Math.max(...ratings) : 0), [ratings]);

  const commit = (index: number) => (isTrashStep ? onTrash(index) : onPick(index));

  const Variant = VARIANT_COMPONENTS[variant] ?? ClassicPro;
  const hasRatings = Boolean(ratings && ratings.length > 0);
  // Arena-family variants animate their own pack turnover, so they stay mounted
  // through the brief inter-pick loading rather than being swapped for a spinner.
  const managesOwnLoading = Boolean(DRAFT_VARIANT_META[variant].poolOnTop);

  return (
    <Card className="mt-3">
      <CardHeader className="flex flex-wrap justify-between items-center gap-2">
        <Text semibold lg className="whitespace-nowrap">
          {title}
        </Text>
        <div className="flex flex-wrap gap-2 items-center">
          {headerActions}
          {error ? (
            <Button onClick={onRetry} color="danger" disabled={retryInProgress}>
              {retryInProgress ? 'Retrying...' : 'Bot picks failed. Try again?'}
            </Button>
          ) : (
            <Button
              className={hasRatings && variant !== 'tier' ? '' : 'invisible'}
              onClick={() => setShowRatings((s) => !s)}
              color="primary"
            >
              {showRatings ? 'Hide Bot Ratings' : 'Show CubeCobra Bot Ratings'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {loading && !managesOwnLoading ? (
          <div className="centered py-3">
            <div className="spinner" />
          </div>
        ) : (
          <Variant
            pack={pack}
            ratings={ratings}
            maxRating={maxRating}
            showRatings={showRatings}
            loading={loading}
            disabled={disabled || error}
            isTrashStep={isTrashStep}
            commit={commit}
          />
        )}
      </CardBody>
    </Card>
  );
};

export default DraftPackView;
