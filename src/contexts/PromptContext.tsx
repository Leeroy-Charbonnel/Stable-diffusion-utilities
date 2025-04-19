import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Prompt } from '@/types';
import * as promptsApi from '@/services/promptsApi';
import { generateUUID } from '@/lib/utils';
import { toast } from 'sonner';

interface PromptContextType {
    prompts: Prompt[];
    isLoading: boolean;
    error: string | null;

    //Methods
    loadPrompts: () => Promise<void>;
    addPrompt: (prompt: Prompt) => Promise<boolean>;
    updatePrompt: (updatedPrompt: Prompt) => Promise<boolean>;
    deletePrompt: (promptId: string) => Promise<boolean>;
    reorderPrompt: (promptId: string, direction: 'up' | 'down') => Promise<boolean>;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export const PromptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    //Load prompts from the server
    const loadPrompts = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const loadedPrompts = await promptsApi.getAllPrompts();
            setPrompts(loadedPrompts);
        } catch (error) {
            console.error('Failed to load prompts:', error);
            setError(`Failed to load prompts: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const addPrompt = async (prompt: Prompt): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            if (!prompt.id) {
                prompt.id = generateUUID();
            }

            const updatedPrompts = [...prompts, prompt];
            const success = await promptsApi.saveAllPrompts(updatedPrompts);

            if (success) {
                setPrompts(updatedPrompts);
                toast("Prompt created successfully!");
                return true;
            }
            toast("Failed to create prompt")
            return false;
        } catch (error) {
            console.error('Failed to add prompt:', error);
            setError(`Failed to add prompt: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    //Update an existing prompt
    const updatePrompt = async (updatedPrompt: Prompt): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const updatedPrompts = prompts.map(p =>
                p.id === updatedPrompt.id ? updatedPrompt : p
            );

            const success = await promptsApi.saveAllPrompts(updatedPrompts);

            if (success) {
                setPrompts(updatedPrompts);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to update prompt:', error);
            setError(`Failed to update prompt: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    //Delete a prompt
    const deletePrompt = async (promptId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const updatedPrompts = prompts.filter(p => p.id !== promptId);
            const success = await promptsApi.saveAllPrompts(updatedPrompts);

            if (success) {
                setPrompts(updatedPrompts);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to delete prompt:', error);
            setError(`Failed to delete prompt: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    //Reorder prompts
    const reorderPrompt = async (promptId: string, direction: 'up' | 'down'): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const promptIndex = prompts.findIndex(p => p.id === promptId);
            if (
                (direction === 'up' && promptIndex === 0) ||
                (direction === 'down' && promptIndex === prompts.length - 1)
            ) {
                return false;
            }

            const newPrompts = [...prompts];
            const newIndex = direction === 'up' ? promptIndex - 1 : promptIndex + 1;
            const promptToMove = newPrompts[promptIndex];
            newPrompts.splice(promptIndex, 1);
            newPrompts.splice(newIndex, 0, promptToMove);

            const success = await promptsApi.saveAllPrompts(newPrompts);

            if (success) {
                setPrompts(newPrompts);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to reorder prompt:', error);
            setError(`Failed to reorder prompt: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    //Load prompts when the context is initialized
    useEffect(() => {
        loadPrompts();
    }, []);

    const value: PromptContextType = {
        prompts,
        isLoading,
        error,
        loadPrompts,
        addPrompt,
        updatePrompt,
        deletePrompt,
        reorderPrompt
    };

    return <PromptContext.Provider value={value}>{children}</PromptContext.Provider>;
};

//Custom hook to use the Prompt context
export const usePrompt = (): PromptContextType => {
    const context = useContext(PromptContext);
    if (context === undefined) {
        throw new Error('usePrompt must be used within a PromptProvider');
    }
    return context;
};