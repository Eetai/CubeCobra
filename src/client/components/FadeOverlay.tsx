import React from 'react';
import { animated } from '@react-spring/web';

interface FadeOverlayProps {
  fadeTransition: any;
}

const FadeOverlay: React.FC<FadeOverlayProps> = ({ fadeTransition }) => {
  return fadeTransition((style: any, item: boolean) =>
    item && (
      <animated.div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
        style={{
          opacity: style.opacity,
          backdropFilter: style.backdropFilter,
        }}
      >
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-4 bg-bg bg-opacity-80 rounded-lg shadow-lg">
          <div className="text-text text-xl font-medium">
            Completing draft...
          </div>
          <div className="relative h-2 w-32 bg-bg-active rounded-full overflow-hidden">
            <animated.div 
              className="absolute h-full bg-button-primary"
              style={{
                width: '100%',
                left: style.opacity.to((o: number) => `${(o * 100) - 100}%`)
              }}
            />
          </div>
        </div>
      </animated.div>
    )
  );
};

export default FadeOverlay;
