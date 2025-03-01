import React, { useEffect, useState, useMemo } from 'react';

import CardType from '../../datatypes/Card';
import DraftLocation from '../drafting/DraftLocation';
import Button from './base/Button';
import { Card, CardBody, CardHeader } from './base/Card';
import { Col, Row } from './base/Layout';
import Text from './base/Text';
import DraggableCard from './DraggableCard';
import FoilCardImage from './FoilCardImage';

interface PackProps {
  pack: CardType[];
  loading?: boolean;
  loadingPredictions?: boolean;
  title?: string;
  disabled?: boolean;
  ratings?: number[];
  error?: boolean;
  onRetry?: () => void;
  onPickMade?: () => void;
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
}) => {
  const [showRatings, setShowRatings] = useState(false);
  const maxRating = ratings ? Math.max(...ratings) : 0;
  
  // Add state to track current pack and animation state
  const [visiblePack, setVisiblePack] = useState<CardType[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  
  const packChanged = useMemo(() => {
    if (pack.length !== visiblePack.length) return true;
    return pack.some((card, i) => card.details?.scryfall_id !== visiblePack[i]?.details?.scryfall_id);
  }, [pack, visiblePack]);
  
  // Preload images when the pack changes
  useEffect(() => {
    if (pack.length === 0) {
      // If the pack is empty, update immediately
      setVisiblePack([]);
      setImagesLoaded(true);
      return;
    }
    
    if (packChanged && pack.length > 0) {
      // If the pack has changed, start loading images
      setImagesLoaded(false);
      setLoadingImages(true);
      setIsAnimating(true);
      
      // First, fade out the current pack
      setTimeout(() => {
        // After fade out completes, start preloading the new pack images
        const imageUrls = pack.map(card => card.details?.image_normal).filter(Boolean);
        const imagePromises = imageUrls.map(url => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => {
              console.warn(`Failed to preload image: ${url}`);
              resolve(); // Still resolve to avoid hanging the whole pack
            };
            img.src = url as string;
          });
        });
        
        // When all images are loaded, update the pack
        Promise.all(imagePromises)
          .then(() => {
            setVisiblePack(pack);
            setImagesLoaded(true);
            setLoadingImages(false);
            
            // Small delay before fading in
            setTimeout(() => {
              setIsAnimating(false);
            }, 50);
          })
          .catch(err => {
            console.error("Error preloading images:", err);
            // Still display the pack even if some images failed to load
            setVisiblePack(pack);
            setImagesLoaded(true);
            setLoadingImages(false);
            setIsAnimating(false);
          });
      }, 300); // This should match the exit transition duration
    }
  }, [packChanged, pack]);

  useEffect(() => {
    setShowRatings(false);
  }, [pack]);

  // Determine if we should show the loading spinner
  const isLoading = loading || loadingImages || (!imagesLoaded && pack.length > 0);

  return (
    <>
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
          <div className="flex">
            <div className={`flex-grow transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
              {isLoading ? (
                <div className="centered py-3">
                  <div className="spinner" />
                  <div className="mt-2 text-center text-sm text-gray-500">
                    Loading pack...
                  </div>
                </div>
              ) : (
                <Row className="g-0" sm={4} lg={8}>
                  {visiblePack.map((card, index) => {
                    const isHighestRated = ratings && ratings[index] === maxRating;
                    return (
                      <Col
                        key={`pack-${card.details?.scryfall_id}-${index}`}
                        xs={1}
                        className="col-md-1-5 col-lg-1-5 col-xl-1-5 d-flex justify-content-center align-items-center relative"
                      >
                        <div className={`relative ${isHighestRated && showRatings ? 'ring-[5px] ring-offset-0 ring-[#007BFF] rounded-lg' : ''}`}>
                          {disabled || error ? (
                            <FoilCardImage card={card} autocard />
                          ) : (
                            <DraggableCard location={DraftLocation.pack(index)} data-index={index} card={card} />
                          )}
                          {ratings && ratings[index] !== undefined && showRatings && (
                            <div 
                              className={`absolute bottom-[5%] left-1/2 -translate-x-1/2 ${
                                isHighestRated ? 'bg-[#007BFF]/95' : 'bg-gray-700/80'
                              } text-white px-2 py-[2px] rounded-md text-xxs font-semibold tracking-tight text-shadow`}
                              title={`Bot rates this card ${Math.round(ratings[index] * 100)}% for this pick`}
                            >
                              {Math.round(ratings[index] * 100)}%
                            </div>
                          )}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default Pack;
