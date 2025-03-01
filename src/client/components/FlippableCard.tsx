import React from 'react';
import { useSpring, animated as a } from '@react-spring/web';
import Card from '../../datatypes/Card';
import FoilCardImage from './FoilCardImage';
import DraggableCard from './DraggableCard';
import DraftLocation from '../drafting/DraftLocation';

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
  // Spring animation configuration
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
    <div 
      className="relative w-full" 
      style={{ minHeight: '196px', perspective: '1200px' }}
    >
      {/* Front side - previous card (or same card if no previous) */}
      <a.div
        className="absolute w-full h-full"
        style={{
          opacity: opacity.to(o => 1 - o),
          transform: rotateY.to(r => `perspective(1200px) rotateY(${r}deg)`),
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
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
        className="absolute w-full h-full"
        style={{
          opacity,
          transform: rotateY.to(r => `perspective(1200px) rotateY(${r + 180}deg)`),
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          zIndex: isFlipped ? 1 : 0,
          pointerEvents: isFlipped ? 'auto' : 'none',
        }}
      >
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
          
          {/* Rating badge */}
          {rating !== undefined && showRating && (
            <div 
              className={`absolute bottom-2 left-1/2 -translate-x-1/2 
                ${isHighestRated 
                  ? 'bg-gradient-to-r from-blue-600/95 to-blue-500/95' 
                  : 'bg-gradient-to-r from-gray-800/80 to-gray-700/80'
                } 
                text-white px-2 py-[2px] rounded-md text-xxs font-semibold 
                tracking-tight text-shadow w-16 text-center backdrop-blur-sm
                transition-all duration-200 transform ${isHighestRated ? 'scale-110' : ''}`}
              title={`Bot rates this card ${Math.round(rating * 100)}% for this pick`}
              style={{ zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.25)' }}
            >
              {Math.round(rating * 100)}%
            </div>
          )}
        </div>
      </a.div>
    </div>
  );
};

export default FlippableCard;
