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
}

const DraggableCard: React.FC<DraggableCardProps> = ({ card, location, className = '', onClick }) => {
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
    if (!isDragging && onClick) {
      e.preventDefault();
      e.stopPropagation();
      console.log('DraggableCard: direct click detected');
      onClick();
    }
  };

  return (
    <div
      ref={setDragRef}
      className={classNames('no-touch-action w-full', { 'cursor-pointer': !!onClick })}
      {...(isDragging ? {} : listeners)}
      {...attributes}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div 
        ref={setDropRef} 
        className="w-full"
      >
        <FoilCardImage 
          card={card} 
          autocard 
          className={previewClasses} 
          onClick={onClick ? handleClick : undefined}
        />
      </div>
    </div>
  );
};

export default DraggableCard;
