import { ImageMetadata, LabelsData, Prompt } from '@/types';
import { DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER, FILE_API_BASE_URL } from '@/lib/constants';


const dispatchImageSavedEvent = () => {
  const event = new CustomEvent('image-saved');
  window.dispatchEvent(event);
};


export const getImageFromPath = async (imagePath: string): Promise<string> => {
  try {
    if (!imagePath) return '';

    const response = await fetch(`${FILE_API_BASE_URL}/static-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: imagePath }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error getting image from path:', error);
    return '';
  }
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
      createdAt: timestamp,
      promptData: {
        name: promptData.name,
        text: promptData.text,
        negativePrompt: promptData.negativePrompt || "",
        embeddings: promptData.embeddings || [],
        cfgScale: promptData.cfgScale,
        seed: promptData.seed,
        steps: promptData.steps,
        sampler: promptData.sampler,
        model: promptData.model,
        loras: promptData.loras || [],
        width: promptData.width,
        height: promptData.height,
        tags: promptData.tags || [],
      }
    };

    console.log('Sending image to API');
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

export const moveImages = async (moves: Array<{ oldPath: string, newPath: string }>): Promise<{
  success: boolean,
  data: {
    moved: string[],
    errors: {
      id: string,
      error: string
    }[]
  }
}> => {
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

    if (!response.ok) throw new Error(`API error: ${response.status}`);


    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error moving images:', error);
    return { success: false, data: { moved: [], errors: [{ id: '', error: '' }] } };
  }
};

export const openOutputFolder = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/open-folder`, { method: 'POST' });
    if (!response.ok) throw new Error(`API error: ${response.status}`);

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
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to get folders');

    return result.data;
  } catch (error) {
    console.error('Error getting folders:', error);
    return [DEFAULT_OUTPUT_IMAGES_SAVE_FOLDER];
  }
};


export const getLabelsData = async (): Promise<LabelsData> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/labels`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to get labels data');

    return result.data;
  } catch (error) {
    console.error('Error getting labels data:', error);
    return { modelLabels: [], lorasLabels: [] , embeddingsLabels: []};
  }
};

export const saveLabelsData = async (labelsData: LabelsData): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(labelsData),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error saving labels data:', error);
    return false;
  }
};
