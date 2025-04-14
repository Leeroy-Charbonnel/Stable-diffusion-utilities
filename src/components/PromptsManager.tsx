// src/components/PromptsManager.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle, InfoIcon } from 'lucide-react';
import { Prompt } from '@/types';
import { PromptForm } from './PromptForm';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/ApiContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const STORAGE_KEY = 'sd-utilities-prompts';

export function PromptsManager() {
  const { isConnected, availableSamplers, availableModels, availableLoras, currentModel } = useApi();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  //Load prompts from local storage on initial render
  useEffect(() => {
    const savedPrompts = localStorage.getItem(STORAGE_KEY);
    if (savedPrompts) {
      try {
        setPrompts(JSON.parse(savedPrompts));
      } catch (error) {
        console.error('Failed to parse saved prompts:', error);
      }
    }
  }, []);

  //Save prompts to local storage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  }, [prompts]);

  const handleAddPrompt = (prompt: Prompt) => {
    setPrompts((prevPrompts) => [...prevPrompts, prompt]);
    setIsAddingPrompt(false);
  };

  const handleEditPrompt = (updatedPrompt: Prompt) => {
    setPrompts((prevPrompts) =>
      prevPrompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p))
    );
    setEditingPromptId(null);
  };

  const handleDeletePrompt = (id: string) => {
    setPrompts((prevPrompts) => prevPrompts.filter((p) => p.id !== id));
  };

  const handleMovePrompt = (id: string, direction: 'up' | 'down') => {
    const promptIndex = prompts.findIndex((p) => p.id === id);
    if (
      (direction === 'up' && promptIndex === 0) ||
      (direction === 'down' && promptIndex === prompts.length - 1)
    ) {
      return;
    }

    const newPrompts = [...prompts];
    const newIndex = direction === 'up' ? promptIndex - 1 : promptIndex + 1;
    const promptToMove = newPrompts[promptIndex];
    newPrompts.splice(promptIndex, 1);
    newPrompts.splice(newIndex, 0, promptToMove);
    
    setPrompts(newPrompts);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Prompt List</h2>
        <Button onClick={() => setIsAddingPrompt(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Prompt
        </Button>
      </div>

      {!isConnected && (
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>
            Not connected to the Stable Diffusion API. Go to the Execute tab to configure the connection.
          </AlertDescription>
        </Alert>
      )}

      {isAddingPrompt && (
        <Card className="mb-4 p-4">
          <PromptForm 
            onSubmit={handleAddPrompt} 
            onCancel={() => setIsAddingPrompt(false)} 
            availableSamplers={availableSamplers}
            availableModels={availableModels}
            availableLoras={availableLoras}
            currentModel={currentModel}
          />
        </Card>
      )}

      <div className="space-y-4">
        {prompts.map((prompt) => (
          <div key={prompt.id}>
            {editingPromptId === prompt.id ? (
              <Card className="p-4">
                <PromptForm
                  prompt={prompt}
                  onSubmit={handleEditPrompt}
                  onCancel={() => setEditingPromptId(null)}
                  availableSamplers={availableSamplers}
                  availableModels={availableModels}
                  availableLoras={availableLoras}
                  currentModel={currentModel}
                />
              </Card>
            ) : (
              <PromptCard
                prompt={prompt}
                onEdit={() => setEditingPromptId(prompt.id)}
                onDelete={() => handleDeletePrompt(prompt.id)}
                onMove={handleMovePrompt}
              />
            )}
          </div>
        ))}
      </div>

      {prompts.length === 0 && !isAddingPrompt && (
        <Card className="p-6 text-center text-muted-foreground">
          <p>No prompts added yet. Click "Add Prompt" to get started.</p>
        </Card>
      )}
    </div>
  );
}