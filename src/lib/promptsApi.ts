import { Prompt } from '@/types';
import { FILE_API_BASE_URL } from './constants';

//Get all prompts from the server
export const getAllPrompts = async (): Promise<Prompt[]> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/prompts`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get prompts');
    }

    return result.data;
  } catch (error) {
    console.error('Error getting prompts:', error);
    //Return empty array on error
    return [];
  }
};

//Save all prompts to the server
export const saveAllPrompts = async (prompts: Prompt[]): Promise<boolean> => {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prompts),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();

    return result.success;
  } catch (error) {
    console.error('Error saving prompts:', error);
    return false;
  }
};