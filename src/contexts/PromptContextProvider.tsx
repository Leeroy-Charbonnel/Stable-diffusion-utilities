// src/contexts/PromptContextProvider.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

type PromptContentType = {
  text?: string;
  negativePrompt?: string;
  tags?: string[];
};

interface PromptContextType {
  copiedContent: PromptContentType;
  copyPromptText: (text: string) => void;
  copyNegativePrompt: (text: string) => void;
  copyTags: (tags: string[]) => void;
  hasCopiedText: boolean;
  hasCopiedNegativePrompt: boolean;
  hasCopiedTags: boolean;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export function PromptContextProvider({ children }: { children: ReactNode }) {
  const [copiedContent, setCopiedContent] = useState<PromptContentType>({});

  const copyPromptText = (text: string) => {
    setCopiedContent(prev => ({ ...prev, text }));
  };

  const copyNegativePrompt = (text: string) => {
    setCopiedContent(prev => ({ ...prev, negativePrompt: text }));
  };

  const copyTags = (tags: string[]) => {
    setCopiedContent(prev => ({ ...prev, tags }));
  };

  return (
    <PromptContext.Provider
      value={{
        copiedContent,
        copyPromptText,
        copyNegativePrompt,
        copyTags,
        hasCopiedText: !!copiedContent.text,
        hasCopiedNegativePrompt: !!copiedContent.negativePrompt,
        hasCopiedTags: !!copiedContent.tags?.length
      }}
    >
      {children}
    </PromptContext.Provider>
  );
}

export const usePromptContext = () => {
  const context = useContext(PromptContext);
  if (context === undefined) {
    throw new Error('usePromptContext must be used within a PromptContextProvider');
  }
  return context;
};