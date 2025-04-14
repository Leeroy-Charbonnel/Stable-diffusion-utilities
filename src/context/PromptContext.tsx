// src/context/PromptContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PromptConfig } from '../types/prompt';
import { savePrompts, loadPrompts } from '../lib/storage';

interface PromptContextType {
  prompts: PromptConfig[];
  addPrompt: (prompt: Omit<PromptConfig, 'id'>) => void;
  updatePrompt: (id: string, updates: Partial<PromptConfig>) => void;
  deletePrompt: (id: string) => void;
  reorderPrompts: (startIndex: number, endIndex: number) => void;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export const PromptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [prompts, setPrompts] = useState<PromptConfig[]>(() => loadPrompts());

  const addPrompt = (promptData: Omit<PromptConfig, 'id'>) => {
    const newPrompt: PromptConfig = {
      ...promptData,
      id: uuidv4(),
    };
    
    setPrompts(prevPrompts => {
      const updatedPrompts = [...prevPrompts, newPrompt];
      savePrompts(updatedPrompts);
      return updatedPrompts;
    });
  };

  const updatePrompt = (id: string, updates: Partial<PromptConfig>) => {
    setPrompts(prevPrompts => {
      const updatedPrompts = prevPrompts.map(prompt => 
        prompt.id === id ? { ...prompt, ...updates } : prompt
      );
      savePrompts(updatedPrompts);
      return updatedPrompts;
    });
  };

  const deletePrompt = (id: string) => {
    setPrompts(prevPrompts => {
      const updatedPrompts = prevPrompts.filter(prompt => prompt.id !== id);
      savePrompts(updatedPrompts);
      return updatedPrompts;
    });
  };

  const reorderPrompts = (startIndex: number, endIndex: number) => {
    setPrompts(prevPrompts => {
      const result = Array.from(prevPrompts);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      savePrompts(result);
      return result;
    });
  };

  return (
    <PromptContext.Provider value={{ prompts, addPrompt, updatePrompt, deletePrompt, reorderPrompts }}>
      {children}
    </PromptContext.Provider>
  );
};

export const usePrompts = () => {
  const context = useContext(PromptContext);
  if (context === undefined) {
    throw new Error('usePrompts must be used within a PromptProvider');
  }
  return context;
};

// src/context/ImageContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ImageMetadata, ImageWithBlob } from '../types/image';
import { saveImages, loadImages } from '../lib/storage';

interface ImageContextType {
  images: ImageWithBlob[];
  addImage: (image: Omit<ImageMetadata, 'id' | 'createdAt'>) => void;
  updateImage: (id: string, updates: Partial<ImageMetadata>) => void;
  deleteImage: (id: string) => void;
  addTagToImage: (imageId: string, tag: string) => void;
  removeTagFromImage: (imageId: string, tag: string) => void;
  filterImagesByTags: (tags: string[]) => ImageWithBlob[];
  searchImages: (query: string) => ImageWithBlob[];
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const ImageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [images, setImages] = useState<ImageWithBlob[]>(() => loadImages());

  //Load image blobs when component mounts
  useEffect(() => {
    const loadImageBlobs = async () => {
      const imagesWithBlobs = await Promise.all(
        images.map(async (image) => {
          if (image.url || image.blob) return image;
          
          try {
            const response = await fetch(image.path);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            return { ...image, blob, url };
          } catch (error) {
            console.error(`Failed to load image: ${image.path}`, error);
            return image;
          }
        })
      );
      
      setImages(imagesWithBlobs);
    };

    loadImageBlobs();
  }, []);

  const addImage = (imageData: Omit<ImageMetadata, 'id' | 'createdAt'>) => {
    const newImage: ImageMetadata = {
      ...imageData,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    
    setImages(prevImages => {
      const updatedImages = [...prevImages, newImage];
      saveImages(updatedImages);
      return updatedImages;
    });
  };

  const updateImage = (id: string, updates: Partial<ImageMetadata>) => {
    setImages(prevImages => {
      const updatedImages = prevImages.map(image => 
        image.id === id ? { ...image, ...updates } : image
      );
      saveImages(updatedImages);
      return updatedImages;
    });
  };

  const deleteImage = (id: string) => {
    setImages(prevImages => {
      const imageToDelete = prevImages.find(img => img.id === id);
      if (imageToDelete?.url) {
        URL.revokeObjectURL(imageToDelete.url);
      }
      
      const updatedImages = prevImages.filter(image => image.id !== id);
      saveImages(updatedImages);
      return updatedImages;
    });
  };

  const addTagToImage = (imageId: string, tag: string) => {
    setImages(prevImages => {
      const updatedImages = prevImages.map(image => {
        if (image.id === imageId && !image.tags.includes(tag)) {
          return { ...image, tags: [...image.tags, tag] };
        }
        return image;
      });
      saveImages(updatedImages);
      return updatedImages;
    });
  };

  const removeTagFromImage = (imageId: string, tag: string) => {
    setImages(prevImages => {
      const updatedImages = prevImages.map(image => {
        if (image.id === imageId) {
          return { ...image, tags: image.tags.filter(t => t !== tag) };
        }
        return image;
      });
      saveImages(updatedImages);
      return updatedImages;
    });
  };

  const filterImagesByTags = (tags: string[]) => {
    if (tags.length === 0) return images;
    
    return images.filter(image => 
      tags.every(tag => image.tags.includes(tag))
    );
  };

  const searchImages = (query: string) => {
    if (!query) return images;
    
    const lowercaseQuery = query.toLowerCase();
    return images.filter(image => 
      image.prompt.toLowerCase().includes(lowercaseQuery) ||
      image.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  };

  return (
    <ImageContext.Provider 
      value={{ 
        images, 
        addImage, 
        updateImage, 
        deleteImage, 
        addTagToImage, 
        removeTagFromImage,
        filterImagesByTags,
        searchImages
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};

export const useImages = () => {
  const context = useContext(ImageContext);
  if (context === undefined) {
    throw new Error('useImages must be used within an ImageProvider');
  }
  return context;
};
