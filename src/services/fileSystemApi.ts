import { ImageMetadata, Prompt } from '@/types';
import { FILE_API_BASE_URL } from '@/lib/constants';

export function getImageUrl(imageId: string | ImageMetadata): string {
  if (!imageId) return '';
  return `${FILE_API_BASE_URL}/images/${imageId}`;
}

//Helper function to dispatch image saved event
const dispatchImageSavedEvent = () => {
  const event = new CustomEvent('image-saved');
  window.dispatchEvent(event);
};

export const saveGeneratedImage = async (
  imageId: string,
  imageBase64: string,
  promptData: Prompt
): Promise<ImageMetadata | null> => {
  try {
    console.log('Saving generated image');

    const timestamp = new Date().toISOString();
    const metadata: ImageMetadata = {
      id: imageId,
      path: '',
      folder: '',
      promptId: promptData.id,
      prompt: promptData.text,
      name: promptData.name || `Image ${new Date().toLocaleDateString()}`, // Add default name based on prompt name
      negativePrompt: promptData.negativePrompt,
      seed: promptData.seed,
      steps: promptData.steps,
      width: promptData.width,
      height: promptData.height,
      sampler: promptData.sampler,
      model: promptData.model,
      loras: promptData.loras || [],
      tags: promptData.tags,
      createdAt: timestamp,
    };

    const response = await fetch(`${FILE_API_BASE_URL}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, metadata }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to save image');
    }

    //Trigger image saved event
    dispatchImageSavedEvent();

    return result.data as ImageMetadata;
  } catch (error) {
    console.error('Error saving generated image:', error);
    return null;
  }
};

export const getAllImageMetadata = async (): Promise<ImageMetadata[]> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/images`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get images');
    }

    return result.data;
  } catch (error) {
    console.error('Error getting images:', error);
    return [];
  }
};

export const updateImageMetadata = async (
  imageId: string,
  updates: Partial<ImageMetadata>
): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/images/${imageId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    //Trigger image saved event for metadata updates
    if (result.success) {
      dispatchImageSavedEvent();
    }

    return result.success;
  } catch (error) {
    console.error('Error updating image metadata:', error);
    return false;
  }
};

export const deleteImage = async (imageId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/images/${imageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    //Trigger image saved event for deletions
    if (result.success) {
      dispatchImageSavedEvent();
    }

    return result.success;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};

export const moveImageToFolder = async (imageId: string, folder: string): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/images/${imageId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    //Trigger image saved event for moves
    if (result.success) {
      dispatchImageSavedEvent();
    }

    return result.success;
  } catch (error) {
    console.error('Error moving image:', error);
    return false;
  }
};

export const openOutputFolder = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/open-folder`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error opening output folder:', error);
    return false;
  }
};


export const getFolders = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/folders`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get folders');
    }

    return result.data;
  } catch (error) {
    console.error('Error getting folders:', error);
    return ['default'];
  }
};