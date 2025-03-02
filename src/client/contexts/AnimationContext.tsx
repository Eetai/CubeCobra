import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AnimationContextProps {
  animationsEnabled: boolean;
  toggleAnimations: () => void;
}

const AnimationContext = createContext<AnimationContextProps>({
  animationsEnabled: true,
  toggleAnimations: () => {},
});

interface AnimationProviderProps {
  children: ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);

  // Load preference from localStorage on initial render
  useEffect(() => {
    const savedPreference = localStorage.getItem('animationsEnabled');
    if (savedPreference !== null) {
      setAnimationsEnabled(savedPreference === 'true');
    }
  }, []);

  const toggleAnimations = () => {
    const newValue = !animationsEnabled;
    setAnimationsEnabled(newValue);
    localStorage.setItem('animationsEnabled', newValue.toString());
  };

  useEffect(() => {
    // Apply or remove the class based on animation state
    if (!animationsEnabled) {
      document.body.classList.add('animations-disabled');
    } else {
      document.body.classList.remove('animations-disabled');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('animations-disabled');
    };
  }, [animationsEnabled]);

  return (
    <AnimationContext.Provider value={{ animationsEnabled, toggleAnimations }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimations = () => useContext(AnimationContext);
