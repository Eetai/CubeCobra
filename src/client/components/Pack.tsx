import React, { useEffect, useState, useMemo } from 'react';
import CardType from '../../datatypes/Card';
import DraftLocation from '../drafting/DraftLocation';
import Button from './base/Button';
import { Card, CardBody, CardHeader } from './base/Card';
import { Col, Row } from './base/Layout';
import Text from './base/Text';
import FlippableCard from './FlippableCard';
import { prefetchImages, createSafeCard } from '../utils/prefetchUtil';

interface PackProps {
  pack: CardType[];
  loading?: boolean;
  loadingPredictions?: boolean;
  title?: string;
  disabled?: boolean;
  ratings?: number[];
  error?: boolean;
  onRetry?: () => void;
  onPickMade?: (cardIndex?: number) => void;  // Make cardIndex optional
  retryInProgress?: boolean;
  endDraftError?: boolean;
  onEndDraft?: () => void;
}

const Pack: React.FC<PackProps> = ({ 
  pack = [], 
  loading = false, 
  loadingPredictions = false,
  title = 'Pack', 
  disabled = false, 
  ratings,
  error = false,
  onRetry,
  retryInProgress = false,
  endDraftError,
  onEndDraft,
  onPickMade
}) => {
  const [showRatings, setShowRatings] = useState(false);
  const maxRating = ratings ? Math.max(...ratings) : 0;
  
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
        // Add these required fields for cardType function
        type_line: card?.type_line || 'Unknown Type',
        colors: card.details?.colors || [],
        cmc: card.details?.cmc || 0,
        scryfall_id: card.details?.scryfall_id || `default-${Math.random().toString(36).substring(2)}`,
      }
    })) as CardType[]; // Explicitly cast to CardType[]
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
      return;
    }
    
    if (packChanged && pack.length > 0) {
      // If the pack has changed, start loading images
      setImagesLoaded(false);
      setLoadingImages(true);
      
      // First show default cards
      setPreviousPack([]);
      setVisiblePack(defaultCards);
      setShowingDefaultCards(true);
      
      // All cards start as not flipped
      setCardsFlipped(new Array(pack.length).fill(false));
      
      // Preload the real card images
      const imageUrls = pack.map(card => card.details?.image_normal).filter(Boolean);
      prefetchImages(imageUrls as string[]).then(() => {
        // After images are loaded, update to the real pack but keep cards unflipped
        setPreviousPack(defaultCards);
        setVisiblePack(pack);
        setImagesLoaded(true);
        setLoadingImages(false);
        setShowingDefaultCards(false);
        
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
  }, [packChanged, pack, visiblePack, pickInProgress, defaultCards]);

  useEffect(() => {
    setShowRatings(false);
  }, [pack]);

  // Determine if we should show the loading spinner
  const isLoading = loading || loadingImages || (!imagesLoaded && pack.length > 0);

  // // Make this handler more straightforward and debug it
  // const handleCardClick = (cardIndex: number): void => {
  //   console.log(`Pack: handleCardClick called for card index ${cardIndex}`);
    
  //   if (disabled) {
  //     console.log('Pack: Click ignored because component is disabled');
  //     return;
  //   }
    
  //   setPickInProgress(true);
    
  //   if (onPickMade) {
  //     console.log(`Pack: Executing onPickMade with index ${cardIndex}`);
  //     // Add a slight delay to ensure the UI isn't interrupted
  //     setTimeout(() => {
  //       onPickMade(cardIndex);
  //     }, 10);
  //   } else {
  //     console.log('Pack: onPickMade function is not defined');
  //   }
  // };

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

  return (
    <Card className="mt-3">
      <CardHeader className="flex justify-between items-center">
        <Text semibold lg>
          {title}
        </Text>
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
          ratings && ratings.length > 0 && !showRatings && imagesLoaded && (
            <Button
              onClick={() => setShowRatings(true)}
              color="primary"
            >
              Show CubeCobra Bot Ratings
            </Button>
          )
        )}
        {endDraftError && (
          <Button color="danger" onClick={onEndDraft} disabled={loading}>
            Retry End Draft
          </Button>
        )}
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
          // Change the way we handle card clicks - much simpler approach
          <Row className="g-0" sm={4} lg={8}>
            {processedPack.map((card, cardIndex) => {
              const isHighestRated = ratings && ratings[cardIndex] === maxRating;
              const previousCard = getPreviousCard(cardIndex);
              
              return (
                <Col
                  key={`pack-${card.details?.scryfall_id || cardIndex}-${cardIndex}`}
                  xs={1}
                  className="col-md-1-5 col-lg-1-5 col-xl-1-5 p-1 d-flex justify-content-center align-items-center"
                >
                  {/* Simple wrapper div that handles the click */}
                  <div 
                    className="w-full mb-6 cursor-pointer" 
                    onClick={() => {
                      // Only allow clicks when the card is flipped and not disabled
                      if (!disabled && cardsFlipped[cardIndex]) {
                        console.log(`Direct click on wrapper div for card ${cardIndex}`);
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
                      // No onFlipped prop - we don't want FlippableCard to handle clicks
                    />
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </CardBody>
    </Card>
  );
};

export default Pack;
