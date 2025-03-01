import React from 'react';
import Card from '../../datatypes/Card';

// Accept any kind of click handler to be more flexible
interface FoilCardImageProps {
  card: Card;
  autocard?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  wrapperTag?: string; // Add this for Markdown component compatibility
}

const FoilCardImage: React.FC<FoilCardImageProps> = ({ 
  card, 
  autocard, // Keep this as it's used elsewhere in the codebase
  className, 
  onClick,
  wrapperTag = 'div' // Default to div if not specified
}) => {
  const cardIsFoil = card.finish === 'Foil';
  const imgUrl = card.details?.image_normal || '/content/default_card.png';
  
  // Add autocard class if needed
  const imgClassName = `card-border w-full ${autocard ? 'autocard' : ''}`;
  
  const WrapperComponent = wrapperTag as keyof JSX.IntrinsicElements;
  
  return (
    <WrapperComponent className={className || ''}>
      <img 
        src={imgUrl} 
        alt={card.details?.name || 'Card'} 
        className={imgClassName}
        onClick={onClick}
        data-card-name={card.details?.name || ''}
      />
      {cardIsFoil && <img src='/content/foilOverlay.png' className="foilOverlay" alt="foil overlay" />}
    </WrapperComponent>
  );
};

export default FoilCardImage;
