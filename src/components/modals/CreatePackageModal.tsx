import React, { useEffect, useState } from 'react';

import AutocompleteInput from 'components/base/AutocompleteInput';
import LoadingButton from 'components/LoadingButton';
import { csrfFetch } from 'utils/CSRF';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'components/base/Modal';
import Input from 'components/base/Input';
import Button from 'components/base/Button';
import { Card } from 'components/base/Card';
import { Row, Col, Flexbox } from 'components/base/Layout';

interface CreatePackageModalProps {
  isOpen: boolean;
  setOpen: (val: boolean) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

const CreatePackageModal: React.FC<CreatePackageModalProps> = ({ isOpen, setOpen, onError, onSuccess }) => {
  const [cards, setCards] = useState<string[]>([]);
  const [cardName, setCardName] = useState<string>('');
  const [packageName, setPackageName] = useState<string>('');
  const [imageDict, setImageDict] = useState<{ [key: string]: { id: string } }>({});

  useEffect(() => {
    fetch('/cube/api/imagedict')
      .then((response) => response.json())
      .then((json) => {
        setImageDict(json.dict);
      });
  }, []);

  const submitCard = () => {
    if (imageDict) {
      const result = imageDict[cardName.toLowerCase()];
      if (result) {
        setCards([...cards, result.id]);
        setCardName('');
      }
    }
  };

  const save = async () => {
    const response = await csrfFetch(`/packages/submit/`, {
      method: 'POST',
      body: JSON.stringify({ cards, packageName }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const json = await response.json();

    if (json.success === 'true') {
      onSuccess('Successfully created package');
      setCards([]);
      setCardName('');
      setPackageName('');
    } else {
      onError(`Error creating package: ${json.message}`);
    }
    setOpen(false);
  };

  return (
    <Modal xl isOpen={isOpen} setOpen={setOpen}>
      <ModalHeader setOpen={setOpen}>Create New Package</ModalHeader>
      <ModalBody>
        <Flexbox direction="col" className="w-full" gap="2">
          <p>
            A package is a set of cards with some unifying theme, such as 'Power 9' or 'Fetchlands'. Once approved,
            these packages can be quickly added to any cube.
          </p>
          <Input
            type="text"
            value={packageName}
            placeholder="Untitled Package"
            onChange={(e) => setPackageName(e.target.value)}
            label="Package Name"
          />
          <AutocompleteInput
            treeUrl="/cube/api/fullnames"
            treePath="cardnames"
            type="text"
            className="me-2"
            name="remove"
            value={cardName}
            setValue={setCardName}
            onSubmit={(event: React.FormEvent) => event.preventDefault()}
            placeholder="Card name and version"
            autoComplete="off"
            data-lpignore
          />
          <Button
            color="primary"
            block
            onClick={submitCard}
            disabled={!(imageDict && imageDict[cardName.toLowerCase()])}
          >
            Add Card
          </Button>
          <Row xs={10}>
            {cards.map((cardId, index) => (
              <Col key={cardId} xs={5} lg={2}>
                <Card className="mb-3">
                  <img className="w-full card-border" src={`/tool/cardimage/${cardId}`} alt={cardId} />
                  <Button
                    color="danger"
                    outline
                    block
                    onClick={() => {
                      const temp = cards.slice();
                      temp.splice(index, 1);
                      setCards(temp);
                    }}
                  >
                    Remove
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </Flexbox>
      </ModalBody>
      <ModalFooter>
        <Flexbox justify="between" className="w-full" gap="2">
          <LoadingButton color="primary" onClick={save} block>
            Submit Package
          </LoadingButton>
          <Button color="danger" onClick={() => setOpen(false)} block>
            Cancel
          </Button>
        </Flexbox>
      </ModalFooter>
    </Modal>
  );
};

export default CreatePackageModal;
