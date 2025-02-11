import React, { useCallback , useMemo } from 'react';

import classNames from 'classnames';

import CardType from '../../datatypes/Card';
import { Col,Row } from '../components/base/Layout'
import DraftLocation from '../drafting/DraftLocation';
import { Card, CardBody, CardHeader } from './base/Card';
import Text from './base/Text';
import DraggableCard from './DraggableCard';
import FoilCardImage from './FoilCardImage';

interface PackProps {
  pack: CardType[];
  ratings?: number[];
  loading?: boolean;
  title?: string;
  disabled?: boolean;
}

const Pack: React.FC<PackProps> = ({ pack, ratings, loading = false, title = 'Pack', disabled = false }) => {
  const highestRating = useMemo(() => ratings ? Math.max(...ratings) : null, [ratings]);
  const lowestRating = useMemo(() => ratings ? Math.min(...ratings) : null, [ratings]);

  const getRatingColor = useCallback((rating: number) => {
    if (!highestRating || !lowestRating || highestRating === lowestRating) return 'text-gray-500';
    
    // Calculate percentage of max rating (0 to 1)
    const normalizedRating = (rating - lowestRating) / (highestRating - lowestRating);
    
    // Map to different shades of red based on rating
    if (normalizedRating > 0.8) return 'text-red-700';
    if (normalizedRating > 0.6) return 'text-red-600';
    if (normalizedRating > 0.4) return 'text-red-500';
    if (normalizedRating > 0.2) return 'text-red-400';
    return 'text-red-300';
  }, [highestRating, lowestRating]);

  const formatRating = useCallback((rating: number) => {
    return `${Math.round(rating * 100)}%`;
  }, []);

  const renderCard = useCallback((card: CardType, index: number) => (
    <Col
      key={`pack-${card.details?.scryfall_id ?? index}`}
      xs={1}
      className="relative"
    >
      <div className="flex flex-col items-center">
        <div className={classNames(
          "relative",
          ratings?.[index] === highestRating && "ring-4 ring-red-500 ring-offset-2 rounded-sm"
        )}>
          {disabled ? (
            <FoilCardImage card={card} autocard />
          ) : (
            <DraggableCard location={DraftLocation.pack(index)} card={card} />
          )}
        </div>
        {ratings && ratings[index] !== undefined && (
          <div className={classNames(
            "mt-1 text-sm font-semibold",
            getRatingColor(ratings[index])
          )}>
            {formatRating(ratings[index])}
          </div>
        )}
      </div>
    </Col>
  ), [disabled, ratings, getRatingColor, formatRating, highestRating]);

  return (
    <Card className="mt-3">
      <CardHeader>
        <Text semibold lg>
          {title}
        </Text>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="centered py-3">
            <div className="spinner" />
          </div>
        ) : (
          <Row className="g-0" sm={4} lg={8}>
            {pack.map(renderCard)}
          </Row>
        )}
      </CardBody>
    </Card>
  );
};

export default Pack;
