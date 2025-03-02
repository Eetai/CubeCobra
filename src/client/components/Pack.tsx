import React, { useEffect, useMemo,useState } from 'react';

import CardType from '../../datatypes/Card';
import { useAnimations } from '../contexts/AnimationContext';
import DraftLocation from '../drafting/DraftLocation';
import { createSafeCard,prefetchImages } from '../utils/prefetchUtil';
import Button from './base/Button';
import { Card, CardBody, CardHeader } from './base/Card';
import Text from './base/Text';
import FlippableCard from './FlippableCard';

interface PackProps {
  pack: CardType[];
  loading?: boolean;
  loadingPredictions?: boolean;
  title?: string;
  disabled?: boolean;
  ratings?: number[];
  showRatings?: boolean;
  setShowRatings?: (show: boolean) => void;
  error?: boolean;
  onRetry?: () => void;
  onPickMade?: (cardIndex?: number) => void;  // Make cardIndex optional
  retryInProgress?: boolean;
}

const Pack: React.FC<PackProps> = ({ 
  pack = [], 
  loading = false, 
  loadingPredictions = false,
  title = 'Pack', 
  disabled = false, 
  ratings = [],
  showRatings = false,
  setShowRatings = () => {},
  error = false,
  onRetry,
  retryInProgress = false,
  onPickMade
}) => {
  const { animationsEnabled } = useAnimations();
  const maxRating = ratings ? Math.max(...ratings, 0) : 0;
  
  // Add state to track current pack and animation state
  const [visiblePack, setVisiblePack] = useState<CardType[]>([]);
  const [previousPack, setPreviousPack] = useState<CardType[]>([]); // Store previous pack for animation
  const [cardsFlipped, setCardsFlipped] = useState<boolean[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  
  // Add new state to track if a pick is in progress
  const [pickInProgress, setPickInProgress] = useState(false);
  
  // Add state to track if we're showing default cards
  const [showingDefaultCards, setShowingDefaultCards] = useState(false);
  
  // Use the isNewPack state to determine the behavior, but we need to modify how we update it:
  const [isNewPack, setIsNewPack] = useState(true);
  
  const packChanged = useMemo(() => {
    if (pack.length !== visiblePack.length) return true;
    return pack.some((card, i) => card.details?.scryfall_id !== visiblePack[i]?.details?.scryfall_id);
  }, [pack, visiblePack]);
  
  // Create default card placeholders with proper type casting and ensure required fields
  const defaultCards = useMemo(() => {
    if (!pack || pack.length === 0) return [];
    
    return pack.map((card) => ({
      ...card,
      details: {
        ...card.details,
        image_normal: '/content/default_card.png',
        name: 'Card',
        type_line: card?.type_line || 'Unknown Type',
        colors: card.details?.colors || [],
        cmc: card.details?.cmc || 0,
        scryfall_id: card.details?.scryfall_id || `default-${Math.random().toString(36).substring(2)}`,
      }
    })) as CardType[]; 
  }, [pack]);
  
  // Process cards to ensure they have all necessary properties
  const processedPack = useMemo(() => {
    return pack.map(card => createSafeCard(card));
  }, [pack]);
  
  // Preload images when the pack changes
  useEffect(() => {
    // Don't update visuals if a pick is in progress
    if (pickInProgress) return;
    
    if (pack.length === 0) {
      // If the pack is empty, update immediately
      setPreviousPack(visiblePack); // Store current pack as previous before clearing
      setVisiblePack([]);
      setImagesLoaded(true);
      setShowingDefaultCards(false);
      setIsNewPack(true); // Next pack will be a new one
      return;
    }
    
    if (packChanged && pack.length > 0) {
      // If the pack has changed, start loading images
      setImagesLoaded(false);
      setLoadingImages(true);
      
      // Only show default cards if it's a new pack vs. just new picks
      if (isNewPack) {
        // This is a brand new pack, show defaults first
        setPreviousPack([]);
        setVisiblePack(defaultCards);
        setShowingDefaultCards(true);
        
        // All cards start as not flipped
        setCardsFlipped(new Array(pack.length).fill(false));
      } else {
        // This is just a regular pick, keep the previous pack visible
        setPreviousPack(visiblePack);
        setShowingDefaultCards(false);
        
        // All cards start as not flipped to show previous state
        setCardsFlipped(new Array(pack.length).fill(false));
      }
      
      // Preload the real card images
      const imageUrls = pack.map(card => card.details?.image_normal).filter(Boolean);
      prefetchImages(imageUrls as string[]).then(() => {
        // After images are loaded, update to the real pack but keep cards unflipped
        if (isNewPack) {
          // For a new pack, we're flipping from default to real
          setPreviousPack(defaultCards);
        }
        // Otherwise previousPack is already set to the old visiblePack
        
        setVisiblePack(pack);
        setImagesLoaded(true);
        setLoadingImages(false);
        setShowingDefaultCards(false);
        setIsNewPack(false); // Mark that we've loaded this pack
        
        // Flip the cards one by one with a delay
        const flipCards = async () => {
          for (let i = 0; i < pack.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            setCardsFlipped(prev => {
              const newState = [...prev];
              newState[i] = true;
              return newState;
            });
          }
        };
        
        flipCards();
      });
    }
  }, [packChanged, pack, visiblePack, pickInProgress, defaultCards, isNewPack]);

  // Initialize the pack in a flipped state when animations are disabled
  useEffect(() => {
    // If animations are disabled, show all cards immediately 
    if (!animationsEnabled) {
      setCardsFlipped(pack.map(() => true));
      return; 
    }

    // The existing staggered flip animation logic for when animations are enabled
    if (pack.length > 0) {
      const timeoutIds: NodeJS.Timeout[] = [];
      const flipAll = () => {
        for (let i = 0; i < pack.length; i++) {
          if (!cardsFlipped[i]) {
            const timeoutId = setTimeout(() => {
              setCardsFlipped((oldFlipped) => {
                const newFlipped = [...oldFlipped];
                newFlipped[i] = true;
                return newFlipped;
              });
            }, 100 * i);
            timeoutIds.push(timeoutId);
          }
        }
      };

      // Flip all the cards
      flipAll();

      return () => {
        for (const timeoutId of timeoutIds) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [pack, animationsEnabled]); // Added animationsEnabled as a dependency

  // Determine if we should show the loading spinner
  const isLoading = loading || loadingImages || (!imagesLoaded && pack.length > 0);

  // Reset the pickInProgress flag when pack changes entirely (new pack is dealt)
  useEffect(() => {
    // Only reset if we're starting with a fresh pack
    if (pack.length > 0 && visiblePack.length === 0) {
      setPickInProgress(false);
    }
  }, [pack, visiblePack]);

  // Find the matching card from previous pack by position, or use undefined if no match
  const getPreviousCard = (index: number): CardType | undefined => {
    if (previousPack.length > index) {
      return previousPack[index];
    }
    return undefined;
  };

  // When we detect a new pack, update our isNewPack flag
  useEffect(() => {
    if (packChanged) {
      // It's a new pack if:
      // 1. The previous pack was empty and this one has cards (first pack or new pack after empty)
      // 2. The number of cards is higher than before (which indicates a new pack vs a pick)
      const isStartingNewPack = 
        (visiblePack.length === 0 && pack.length > 0) || // First pack or after empty
        (pack.length > visiblePack.length); // More cards than before = new pack
        
      setIsNewPack(isStartingNewPack);
    }
  }, [packChanged, pack.length, visiblePack.length]);

  return (
    <Card className="mt-3">
      <CardHeader className="flex justify-between items-center">
        <Text semibold lg>
          {title}
        </Text>
        
        <div className="flex items-center gap-2">
          {error ? (
            <Button
              onClick={onRetry}
              color="danger"
              disabled={retryInProgress}
            >
              {retryInProgress ? 'Retrying...' : 'Bot picks failed. Try again?'}
            </Button>
          ) : loadingPredictions ? (
            <Button
              color="secondary"
              disabled
            >
              Making Bot Picks...
            </Button>
          ) : (
            ratings && ratings.length > 0 && imagesLoaded && (
              <Button
                onClick={() => setShowRatings(!showRatings)}
                color={showRatings ? "secondary" : "primary"}
              >
                {showRatings ? 'Hide Bot Ratings' : 'Show CubeCobra Bot Ratings'}
              </Button>
            )
          )}
        </div>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="centered py-3">
            <div className="spinner" />
            <div className="mt-2 text-center text-sm text-gray-500">
              Loading pack...
            </div>
          </div>
        ) : (
          <div className="pack-cards-grid">
            {processedPack.map((card, cardIndex) => {
              const isHighestRated = ratings && ratings[cardIndex] === maxRating;
              const previousCard = getPreviousCard(cardIndex);
              return (
                <div 
                  key={`pack-${card.details?.scryfall_id || cardIndex}-${cardIndex}`}
                  className="pack-card-item" 
                  onMouseUp={() => {
                    if (!disabled && cardsFlipped[cardIndex]) {
                      onPickMade?.(cardIndex);
                    }
                  }}
                >
                  <FlippableCard
                    card={card}
                    previousCard={previousCard}
                    location={DraftLocation.pack(cardIndex)}
                    isFlipped={cardsFlipped[cardIndex] || false}
                    disabled={disabled || error || showingDefaultCards}
                    index={cardIndex}
                    isHighestRated={isHighestRated}
                    showRating={showRatings && !showingDefaultCards}
                    rating={ratings ? ratings[cardIndex] : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default Pack;