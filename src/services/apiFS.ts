import { ImageMetadata, Prompt } from '@/types';
import { FILE_API_BASE_URL } from '@/lib/constants';

export function getImageUrl(imageId: string | ImageMetadata): string {
  if (!imageId) return '';
  const id = typeof imageId === 'string' ? imageId : imageId.id;
  return `${FILE_API_BASE_URL}/images/${id}`;
}

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
      path: '', //Will be set by the server
      folder: '', //Will be set by the server
      prompt: promptData.text,
      name: promptData.name,
      negativePrompt: promptData.negativePrompt || "",
      cfgScale: promptData.cfgScale,
      seed: promptData.seed,
      steps: promptData.steps,
      width: promptData.width,
      height: promptData.height,
      sampler: promptData.sampler,
      model: promptData.model,
      loras: promptData.loras || [],
      tags: promptData.tags || [],
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
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to get images');

    return result.data;
  } catch (error) {
    console.error('Error getting images:', error);
    return [];
  }
};

export const deleteImagesByPaths = async (imagePaths: string[]): Promise<boolean> => {
  try {
    if (imagePaths.length === 0) {
      throw new Error('No paths provided for deletion');
    }
    const response = await fetch(`${FILE_API_BASE_URL}/images/delete-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: imagePaths }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const result = await response.json();

    if (result.success) dispatchImageSavedEvent();

    return result.success;
  } catch (error) {
    console.error('Error deleting images:', error);
    return false;
  }
};

export const moveImages = async (moves: Array<{ oldPath: string, newPath: string }>): Promise<boolean> => {
  try {
    if (moves.length === 0) {
      throw new Error('No move operations provided');
    }

    //Use the batch move endpoint
    const response = await fetch(`${FILE_API_BASE_URL}/images/move-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moves }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) dispatchImageSavedEvent();


    return result.success;
  } catch (error) {
    console.error('Error moving images:', error);
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