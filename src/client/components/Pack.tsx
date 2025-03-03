import React from 'react';

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
  showRatings?: boolean;
  setShowRatings?: (show: boolean) => void;
  error?: boolean;
  onRetry?: () => void;
  onPickMade?: (cardIndex?: number) => void;
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
  const maxRating = ratings ? Math.max(...ratings, 0) : 0;

  // Define badge style directly
  const badgeStyles = {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    minWidth: '40px',
    padding: '3px 8px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(2px)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    display: 'block'
  } as React.CSSProperties;

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
            ratings && ratings.length > 0 && (
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
        {loading ? (
          <div className="centered py-3">
            <div className="spinner" />
            <div className="mt-2 text-center text-sm text-gray-500">
              Loading pack...
            </div>
          </div>
        ) : (
          <Row className="g-0" sm={4} lg={8}>
            {pack.map((card, index) => {
              const isHighestRated = ratings && ratings[index] === maxRating;
              
              return (
                <Col
                  key={`pack-${card.details?.scryfall_id || index}-${index}`}
                  xs={1}
                  className="col-md-1-5 col-lg-1-5 col-xl-1-5 d-flex justify-content-center align-items-center"
                >
                  <div style={{ position: 'relative', width: '100%' }}>
                    {disabled ? (
                      <>
                        <FoilCardImage card={card} autocard />
                        {showRatings && ratings && ratings[index] !== undefined && (
                          <div 
                            style={{
                              ...badgeStyles,
                              backgroundColor: isHighestRated ? 'rgba(0, 123, 255, 0.95)' : 'rgba(55, 65, 81, 0.9)',
                              fontWeight: isHighestRated ? 700 : 600,
                            }}
                            title={`Bot rates this card ${Math.round(ratings[index] * 100)}% for this pick`}
                          >
                            {Math.round(ratings[index] * 100)}%
                          </div>
                        )}
                      </>
                    ) : (
                      <DraggableCard 
                        location={DraftLocation.pack(index)} 
                        data-index={index} 
                        card={card}
                        onClick={() => onPickMade?.(index)}
                        showRating={showRatings}
                        rating={ratings[index]}
                        isHighestRated={isHighestRated}
                      />
                    )}
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