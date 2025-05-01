import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { LoraEditorConfig, PromptEditor } from '@/types';
import * as promptsApi from '@/services/apiPrompt';
import { toast } from 'sonner';
import { DEBOUNCE_DELAY, DEFAULT_PROMPT_STEP } from '@/lib/constants';
import { generateUUID } from '@/lib/utils';

interface PromptContextType {
    prompts: PromptEditor[];
    UpdateCopyPromptPart: <T extends keyof PromptEditor>(propName: T, value: PromptEditor[T]) => void;
    GetCopyPromptPart: <T extends keyof PromptEditor>(propName: T) => PromptEditor[T] | undefined;
    isLoading: boolean;
    error: string | null;
    loadPrompts: () => Promise<void>;
    addPrompt: (prompt: PromptEditor) => Promise<boolean>;
    updatePrompt: (updatedPrompt: PromptEditor) => Promise<boolean>;
    deletePrompt: (promptId: string) => Promise<boolean>;
    reorderPrompt: (promptId: string, direction: 'up' | 'down') => Promise<boolean>;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export const PromptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [prompts, setPrompts] = useState<PromptEditor[]>([]);
    const [promptCopy, setPromptCopy] = useState<PromptEditor | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialiseCopyPrompt = () => {
        console.log("initialiseCopyPrompt");
        const prompt: PromptEditor = {
            id: generateUUID(),
            isOpen: false,
            name: '',
            text: '',
            negativePrompt: '',
            cfgScale: 0,
            seed: -1,
            steps: DEFAULT_PROMPT_STEP,
            sampler: '',
            models: [],
            width: 0,
            height: 0,
            lorasRandom: false,
            runCount: 1,
            tags: [],
            loras: [],
            currentRun: 0,
            status: 'idle',
        };
        setPromptCopy(prompt);
    }

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
        initialiseCopyPrompt();
        loadPrompts();
    }, []);

    const addPrompt = async (prompt: PromptEditor): Promise<boolean> => {
        setIsLoading(true);
        try {
            const updatedPrompts = [...prompts, prompt];
            console.log("add prompt");
            const success = await promptsApi.saveAllPrompts(updatedPrompts);

            if (success) {
                setPrompts(updatedPrompts);
                toast.success("Prompt created successfully!");
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

    const updatePrompt = async (updatedPrompt: PromptEditor): Promise<boolean> => {
        const updatedPrompts = prompts.map(p => p.id === updatedPrompt.id ? updatedPrompt : p)
        const success = await promptsApi.saveAllPrompts(updatedPrompts);
        if (success) {
            setPrompts(updatedPrompts);
            return true;
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

            console.log("reorder prompt");
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

    function UpdateCopyPromptPart<T extends keyof PromptEditor>(propName: T, value: PromptEditor[T]) {
        if (!promptCopy) return;
        promptCopy[propName] = value;
        setPromptCopy(promptCopy);
        toast.success(`Copied ${propName} to clipboard`);
    }
    function GetCopyPromptPart<T extends keyof PromptEditor>(propName: T): PromptEditor[T] | undefined {
        if (!promptCopy) return;
        const value = promptCopy[propName];

        if (propName === 'tags' && (value as string[]).length == 0) return
        if (propName === 'loras' && (value as LoraEditorConfig[]).length == 0) return
        if (propName === 'models' && (value as string[]).length == 0) return

        return value;
    }

    const value: PromptContextType = {
        prompts,
        UpdateCopyPromptPart,
        GetCopyPromptPart,
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