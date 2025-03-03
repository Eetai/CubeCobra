import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import classNames from 'classnames';
import Card from '../../datatypes/Card';
import DraftLocation from '../drafting/DraftLocation';
import FoilCardImage from './FoilCardImage';

interface DraggableCardProps {
  card: Card;
  location: DraftLocation;
  className?: string;
  onClick?: () => void;
  showRating?: boolean;
  rating?: number;
  isHighestRated?: boolean;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ 
  card, 
  location, 
  className = '', 
  onClick,
  showRating = false,
  rating,
  isHighestRated = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `card-${location.type}-${location.row}-${location.col}-${location.index}`,
    data: location,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${location.type}-${location.row}-${location.col}-${location.index}`,
    data: new DraftLocation(location.type, location.row, location.col, location.index),
  });

  const previewClasses = classNames({ outline: isOver, transparent: isDragging }, className);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  // Define these styles directly to ensure they're applied
  const badgeStyles = {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    backgroundColor: isHighestRated ? 'rgba(0, 123, 255, 0.95)' : 'rgba(55, 65, 81, 0.9)',
    color: 'white',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: isHighestRated ? 700 : 600,
    textAlign: 'center',
    minWidth: '40px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    display: 'block',
  } as React.CSSProperties;

  return (
    <div
      ref={setDragRef}
      className="no-touch-action position-relative"
      style={{ position: 'relative', width: '100%' }} // Force position: relative
      {...listeners}
      {...attributes}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div 
        ref={setDropRef}
      >
        <FoilCardImage 
          card={card} 
          autocard 
          className={previewClasses}
        />
      </div>

      {showRating && rating !== undefined && (
        <div 
          style={badgeStyles}
          title={`Bot rates this card ${Math.round(rating * 100)}% for this pick`}
        >
          {Math.round(rating * 100)}%
        </div>
      )}
    </div>
  );
};

export default DraggableCard;
