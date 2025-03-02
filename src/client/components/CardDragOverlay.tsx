import React from 'react';
import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import FoilCardImage from './FoilCardImage';

interface CardDragOverlayProps {
  activeCard: any;
}

const CardDragOverlay: React.FC<CardDragOverlayProps> = ({ activeCard }) => {
  if (!activeCard) return null;
  
  return (
    <DndKitDragOverlay adjustScale={false} dropAnimation={null}>
      <div className="w-[140px] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[9999] opacity-80 shadow-lg">
        <FoilCardImage card={activeCard.card} className="drag-card" />
      </div>
    </DndKitDragOverlay>
  );
};

export default CardDragOverlay;
