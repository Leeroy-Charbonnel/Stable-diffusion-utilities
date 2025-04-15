import { GeneratedImage, ImageMetadata, Prompt } from '@/types';
import { FILE_API_BASE_URL } from './constants';

export const saveGeneratedImage = async (
  imageId: string,
  imageBase64: string,
  promptData: Prompt
): Promise<GeneratedImage | null> => {
  try {
    const timestamp = new Date().toISOString();
    const filename = `img_${imageId}.png`;

    const metadata = {
      id: imageId,
      filename: filename,
      prompt: promptData.text,
      negativePrompt: promptData.negativePrompt,
      seed: promptData.seed,
      steps: promptData.steps,
      width: promptData.width,
      height: promptData.height,
      sampler: promptData.sampler,
      model: promptData.model,
      tags: promptData.tags || [],
      createdAt: timestamp,
    } as ImageMetadata;

    const response = await fetch(`${FILE_API_BASE_URL}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: imageId,
        imageBase64,
        metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to save image');
    }

    return result.data as GeneratedImage;
  } catch (error) {
    console.error('Error saving generated image:', error);
    return null;
  }
};

/**
 * Get all image metadata
 */
export const getAllImageMetadata = async (): Promise<GeneratedImage[]> => {
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

/**
 * Get image data by ID
 */
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

/**
 * Update image metadata
 */
export const updateImageMetadata = async (
  id: string,
  updates: Partial<GeneratedImage>
): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/images/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();

    return result.success;
  } catch (error) {
    console.error('Error updating image metadata:', error);
    return false;
  }
};

/**
 * Delete image
 */
export const deleteImage = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/images/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();

    return result.success;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};

/**
 * Export all data as JSON
 */
export const exportAllData = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/export`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to export data');
    }

    // Create a download link for the exported data
    const dataStr = JSON.stringify(result.data, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileName = `sd-utilities-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', exportFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting data:', error);
    return false;
  }
};