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
        
        const getRatingStyle = () => {
          if (isHighestRated && wasSelected) return "bg-[#087715]/95";
          if (isHighestRated) return "bg-[#007BFF]/95";
          if (wasSelected) return "bg-[#E6B800]/95";
          return "bg-gray-700/80";
        };
        
        return (
          <Col key={cardIndex} xs={1} className="relative">
            <div className="relative">
              <div className={classNames(
                "relative",
                {
                  "ring-[5px] ring-[#007BFF] ring-offset-0 rounded-lg": isHighestRated && !wasSelected,
                  "ring-[5px] ring-[#E6B800] ring-offset-0 rounded-lg": wasSelected && !isHighestRated,
                  "ring-[5px] ring-[#087715] ring-offset-0 rounded-lg": isHighestRated && wasSelected,
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
                    "absolute bottom-2 left-1/2 transform -translate-x-1/2",
                    "px-2 py-0.5 text-center min-w-[2.5rem]",
                    "text-sm font-semibold text-white",
                    "rounded-md shadow-sm backdrop-blur-[2px]",
                    getRatingStyle()
                  )}>
                    {Math.round(rating * 100)}%
                  </div>
                )}
              </div>
            </div>
          </Col>
        );
      })}
    </Row>
  );
};

export default CardGrid;
