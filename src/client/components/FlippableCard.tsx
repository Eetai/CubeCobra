import React from 'react';

import { animated as a,useSpring } from '@react-spring/web';

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

  // Spring animation configuration
  const springConfig = animationsEnabled ? {
    from: { opacity: isFlipped ? 0 : 1, rotateY: isFlipped ? 0 : 180 },
    to: { opacity: isFlipped ? 1 : 0, rotateY: isFlipped ? 180 : 0 },
    config: { 
      tension: 550,
      friction: 65,
      clamp: true,
    },
  } : {
    // When animations are disabled, just toggle opacity instantly
    from: { opacity: isFlipped ? 1 : 0, rotateY: isFlipped ? 180 : 0 },
    to: { opacity: isFlipped ? 1 : 0, rotateY: isFlipped ? 180 : 0 },
    config: { duration: 0 },
  };

  const { opacity, rotateY } = useSpring(springConfig);
  
  // Shared rating badge component to ensure consistency
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
  
  // When animations disabled, simply render either front or back based on isFlipped
  if (!animationsEnabled) {
    return (
      <div className="relative w-full min-h-[196px]">
        {!isFlipped ? (
          <div className="w-full">
            {previousCard ? (
              <FoilCardImage card={previousCard} autocard />
            ) : (
              <FoilCardImage card={card} autocard />
            )}
          </div>
        ) : (
          <div className="relative w-full h-full">
            <div className={`${isHighestRated && showRating ? 'ring-[5px] ring-offset-0 ring-[#007BFF] rounded-lg' : ''} w-full`}>
              {disabled ? (
                <FoilCardImage card={card} autocard />
              ) : (
                location && 
                <DraggableCard 
                  location={location} 
                  data-index={index} 
                  card={card} 
                />
              )}
            </div>
            
            {/* Use shared rating badge */}
            {rating !== undefined && showRating && <RatingBadge />}
          </div>
        )}
      </div>
    );
  }

  // Original animated version when animations are enabled
  return (
    <div 
      className="relative w-full min-h-[196px] perspective-[1200px]"
    >
      {/* Front side - previous card (or same card if no previous) */}
      <a.div
        className="absolute w-full h-full backface-hidden preserve-3d"
        style={{
          opacity: opacity.to(o => 1 - o),
          transform: rotateY.to(r => `perspective(1200px) rotateY(${r}deg)`),
          zIndex: isFlipped ? 0 : 1,
          pointerEvents: isFlipped ? 'none' : 'auto',
        }}
      >
        {previousCard ? (
          <FoilCardImage card={previousCard} autocard />
        ) : (
          <FoilCardImage card={card} autocard />
        )}
      </a.div>

      {/* Back side - new card */}
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
          <div className={`${isHighestRated && showRating ? 'ring-[5px] ring-offset-0 ring-[#007BFF] rounded-lg' : ''} w-full card-image-wrapper`}>
            {disabled ? (
              <FoilCardImage card={card} autocard />
            ) : (
              location && 
              <DraggableCard 
                location={location} 
                data-index={index} 
                card={card} 
              />
            )}
          </div>
          
          {/* Use shared rating badge */}
          {rating !== undefined && showRating && <RatingBadge />}
        </div>
      </a.div>
    </div>
  );
};

export default FlippableCard;
