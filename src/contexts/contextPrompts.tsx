import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Prompt } from '@/types';
import * as promptsApi from '@/services/apiPrompt';
import { toast } from 'sonner';
import { DEBOUNCE_DELAY } from '@/lib/constants';

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

    //Keep a ref to pending updates to avoid race conditions
    const pendingUpdatesRef = useRef<{ [id: string]: Prompt }>({});
    //Timer for debouncing
    const debouncerRef = useRef<NodeJS.Timeout | null>(null);

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

    //Function to actually save all prompts to server (called after debounce)
    const savePromptsToServer = useCallback(async () => {
        //Only save if there are pending updates
        if (Object.keys(pendingUpdatesRef.current).length === 0) return;

        //Create updated prompts array with all pending changes
        const updatedPrompts = prompts.map(prompt => {
            const pendingUpdate = pendingUpdatesRef.current[prompt.id];
            return pendingUpdate || prompt;
        });

        try {
            //Don't set loading state for debounced updates to prevent UI flicker
            const success = await promptsApi.saveAllPrompts(updatedPrompts);

            if (success) {
                //Only update state if save was successful
                setPrompts(updatedPrompts);
            } else {
                console.error('Failed to save prompts to server');
            }
        } catch (error) {
            console.error('Error saving prompts:', error);
        } finally {
            //Clear pending updates
            pendingUpdatesRef.current = {};
        }
    }, [prompts]);

    const debouncedSave = useCallback(() => {
        if (debouncerRef.current) clearTimeout(debouncerRef.current);
        debouncerRef.current = setTimeout(() => { savePromptsToServer(); }, DEBOUNCE_DELAY);
    }, [savePromptsToServer]);

    //Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debouncerRef.current) {
                clearTimeout(debouncerRef.current);
                //Force save any pending updates on unmount
                if (Object.keys(pendingUpdatesRef.current).length > 0) {
                    savePromptsToServer();
                }
            }
        };
    }, [savePromptsToServer]);

    const addPrompt = async (prompt: Prompt): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
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
            console.error('Failed to add prompt:', error);
            setError(`Failed to add prompt: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    //Update an existing prompt
    const updatePrompt = async (updatedPrompt: Prompt): Promise<boolean> => {
        //For certain operations that need to be immediate (run counts, execution status)
        const needsImmediateUpdate = updatedPrompt.currentRun > 0 || updatedPrompt.status !== 'idle';

        //Immediately update the UI with the changes
        setPrompts(prev =>
            prev.map(p => p.id === updatedPrompt.id ? updatedPrompt : p)
        );

        //Store this update as pending
        pendingUpdatesRef.current[updatedPrompt.id] = updatedPrompt;

        if (needsImmediateUpdate) {
            //Save immediately for execution-related updates
            return savePromptsToServer().then(() => true).catch(() => false);
        } else {
            //Otherwise debounce the save
            debouncedSave();
            return Promise.resolve(true);
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