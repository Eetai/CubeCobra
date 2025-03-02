import React from 'react';
import { animated as a, useSpring } from '@react-spring/web';
import Card from '../../datatypes/Card';
import { useAnimations } from '../contexts/AnimationContext';
import DraftLocation from '../drafting/DraftLocation';
import DraggableCard from './DraggableCard';
import FoilCardImage from './FoilCardImage';

interface FlippableCardProps {
  card: Card;
  previousCard?: Card;
  location?: DraftLocation;
  isFlipped: boolean;
  disabled?: boolean;
  index?: number;
  isHighestRated?: boolean;
  showRating?: boolean;
  rating?: number;
}

const FlippableCard: React.FC<FlippableCardProps> = ({
  card,
  previousCard,
  location,
  isFlipped,
  disabled = false,
  index = 0,
  isHighestRated = false,
  showRating = false,
  rating,
}) => {
  const { animationsEnabled } = useAnimations();

  // Shared rating badge component to ensure consistency in both modes
  const RatingBadge = () => {
    if (rating === undefined || !showRating) return null;
    
    return (
      <div 
        className={`fixed-rating-badge ${isHighestRated ? 'highest-rated' : ''}`}
        title={`Bot rates this card ${Math.round(rating * 100)}% for this pick`}
      >
        {Math.round(rating * 100)}%
      </div>
    );
  };
  

  // When animations disabled, render a simpler version with consistent styling
  if (!animationsEnabled) {
    return (
      <div className="relative w-full min-h-[196px]">
        {!isFlipped ? (
          <div className="card-image-wrapper w-full">
            <FoilCardImage 
              card={previousCard || card} 
              autocard 
            />
          </div>
        ) : (
          <div className="relative w-full h-full">
              {disabled ? (
                <FoilCardImage 
                  card={card} 
                  autocard 
                />
              ) : (
                location && 
                <DraggableCard 
                  location={location} 
                  data-index={index} 
                  card={card} 
                />
              )}
            <RatingBadge />
          </div>
        )}
      </div>
    );
  }

  // Animated version with spring animations
  const springConfig = {
    from: { opacity: isFlipped ? 0 : 1, rotateY: isFlipped ? 0 : 180 },
    to: { opacity: isFlipped ? 1 : 0, rotateY: isFlipped ? 180 : 0 },
    config: { 
      tension: 550,
      friction: 65,
      clamp: true,
    },
  };

  const { opacity, rotateY } = useSpring(springConfig);

  return (
    <div className="relative w-full min-h-[196px] perspective-[1200px]">
      {/* Front side */}
      <a.div
        className="absolute w-full h-full backface-hidden preserve-3d"
        style={{
          opacity: opacity.to(o => 1 - o),
          transform: rotateY.to(r => `perspective(1200px) rotateY(${r}deg)`),
          zIndex: isFlipped ? 0 : 1,
          pointerEvents: isFlipped ? 'none' : 'auto',
        }}
      >
        <div className="card-image-wrapper">
          <FoilCardImage 
            card={previousCard || card} 
            autocard 
          />
        </div>
      </a.div>

      {/* Back side */}
      <a.div
        className="absolute w-full h-full backface-hidden preserve-3d"
        style={{
          opacity,
          transform: rotateY.to(r => `perspective(1200px) rotateY(${r + 180}deg)`),
          zIndex: isFlipped ? 1 : 0,
          pointerEvents: isFlipped ? 'auto' : 'none',
        }}
      >
        <div className="relative w-full h-full">
            {disabled ? (
              <FoilCardImage 
                card={card} 
                autocard 
              />
            ) : (
              location && 
              <DraggableCard 
                location={location} 
                data-index={index} 
                card={card} 
              />
            )}
          <RatingBadge />
        </div>
      </a.div>
    </div>
  );
};

export default FlippableCard;
