import { ImageMetadata, Prompt } from '@/types';
import { FILE_API_BASE_URL } from '@/lib/constants';

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
      folder: '',
      promptId: promptData.id,
      prompt: promptData.text,
      negativePrompt: promptData.negativePrompt,
      seed: promptData.seed,
      steps: promptData.steps,
      width: promptData.width,
      height: promptData.height,
      sampler: promptData.sampler,
      model: promptData.model,
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

export const getImageData = async (imageId: string): Promise<string | null> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/images/${imageId}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Image not found: ${imageId}`);
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get image');
    }

    return result.data;
  } catch (error) {
    console.error(`Error getting image data for ID ${imageId}:`, error);
    return null;
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