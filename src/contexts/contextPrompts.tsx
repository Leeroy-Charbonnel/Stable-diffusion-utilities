import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Prompt } from '@/types';
import * as promptsApi from '@/services/apiPrompt';
import { toast } from 'sonner';
import { DEBOUNCE_DELAY } from '@/lib/constants';

interface PromptContextType {
    prompts: Prompt[];
    isLoading: boolean;
    error: string | null;
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
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const saveToDisk = async () => {
        try {
            await promptsApi.saveAllPrompts(prompts);
        } catch (error) {
            console.error('Error saving prompts:', error);
        }
    };

    //Schedule save with debounce
    const scheduleSave = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(saveToDisk, DEBOUNCE_DELAY);
    };

    //Save on prompts change
    useEffect(() => {
        if (prompts.length > 0) {
            scheduleSave();
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveToDisk();
            }
        };
    }, [prompts]);

    const loadPrompts = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const loadedPrompts = await promptsApi.getAllPrompts();
            setPrompts(loadedPrompts);
        } catch (error) {
            setError(`Failed to load prompts: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    //Load prompts on mount
    useEffect(() => {
        loadPrompts();
    }, []);

    const addPrompt = async (prompt: Prompt): Promise<boolean> => {
        setIsLoading(true);
        try {
            const updatedPrompts = [...prompts, prompt];
            const success = await promptsApi.saveAllPrompts(updatedPrompts);

            if (success) {
                setPrompts(updatedPrompts);
                toast("Prompt created successfully!");
                return true;
            }
            toast("Failed to create prompt");
            return false;
        } catch (error) {
            setError(`Failed to add prompt: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const updatePrompt = async (updatedPrompt: Prompt): Promise<boolean> => {
        //Update immediately
        setPrompts(prev =>
            prev.map(p => p.id === updatedPrompt.id ? updatedPrompt : p)
        );

        //For execution-related updates, save immediately
        if (updatedPrompt.status !== 'idle' || updatedPrompt.currentRun > 0) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            try {
                await saveToDisk();
                return true;
            } catch (error) {
                return false;
            }
        }

        return true;
    };

    const deletePrompt = async (promptId: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const updatedPrompts = prompts.filter(p => p.id !== promptId);
            const success = await promptsApi.saveAllPrompts(updatedPrompts);

            if (success) {
                setPrompts(updatedPrompts);
                return true;
            }
            return false;
        } catch (error) {
            setError(`Failed to delete prompt: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const reorderPrompt = async (promptId: string, direction: 'up' | 'down'): Promise<boolean> => {
        setIsLoading(true);
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
            setError(`Failed to reorder prompt: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

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

export const usePrompt = (): PromptContextType => {
    const context = useContext(PromptContext);
    if (context === undefined) {
        throw new Error('usePrompt must be used within a PromptProvider');
    }
    return context;
};