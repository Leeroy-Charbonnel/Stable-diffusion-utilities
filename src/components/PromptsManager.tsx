import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Prompt } from '../types';
import { PromptForm } from './PromptForm';
import { PromptCard } from './PromptCard';

export function PromptsManager() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

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

      {isAddingPrompt && (
        <Card className="mb-4 p-4">
          <PromptForm onSubmit={handleAddPrompt} onCancel={() => setIsAddingPrompt(false)} />
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