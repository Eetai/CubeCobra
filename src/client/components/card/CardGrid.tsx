import React from 'react';

import classNames from 'classnames';

import Card from '../../../datatypes/Card';
import { Col, NumCols, Row } from '../base/Layout';
import FoilCardImage from '../FoilCardImage';
import { CardImageProps } from './CardImage';

export interface CardGridProps {
  cards: Card[];
  cardProps?: CardImageProps;
  xs?: NumCols;
  sm?: NumCols;
  md?: NumCols;
  lg?: NumCols;
  xl?: NumCols;
  xxl?: NumCols;
  hrefFn?: (card: Card) => string;
  onClick?: (card: Card, index: number) => void;
  className?: string;
  ratings?: number[];
  selectedIndex?: number; // Add this prop
}

const CardGrid: React.FC<CardGridProps> = ({ 
  cards, cardProps, xs, sm, md, lg, xl, xxl, onClick, className, ratings, selectedIndex 
}) => {
  const maxRating = ratings ? Math.max(...(ratings.filter(r => r !== undefined))) : null;
  
  return (
    <Row xs={xs} sm={sm} md={md} lg={lg} xl={xl} xxl={xxl} className={className}>
      {cards.map((card, cardIndex) => {
        const isHighestRated = ratings?.[cardIndex] === maxRating;
        const wasSelected = cardIndex === selectedIndex;
        const rating = ratings?.[cardIndex];
        
        return (
          <Col key={cardIndex} xs={1} className="relative">
            <div className={classNames(
              "relative",
              {
                // Apply multiple borders if both conditions are true
                "ring-2 ring-red-500 ring-offset-2 rounded-sm": isHighestRated && !wasSelected,
                "ring-2 ring-blue-500 ring-offset-2 rounded-sm": wasSelected && !isHighestRated,
                "ring-4 ring-purple-500 ring-offset-2 rounded-sm": isHighestRated && wasSelected,
              }
            )}>
              <FoilCardImage
                card={card}
                autocard
                onClick={() => onClick?.(card, cardIndex)}
                className={onClick ? 'cursor-pointer hover:opacity-80' : undefined}
                {...cardProps}
              />
              {rating !== undefined && (
                <div className={classNames(
                  "text-center py-1",
                  { "font-bold text-red-600": isHighestRated }
                )}>
                  {Math.round(rating * 100)}%
                </div>
              )}
            </div>
          </Col>
        );
      })}
    </Row>
  );
};

export default CardGrid;
