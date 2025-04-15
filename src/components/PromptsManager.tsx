// src/components/PromptsManager.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, InfoIcon } from 'lucide-react';
import { Prompt } from '@/types';
import { PromptForm } from './PromptForm';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/ApiContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const STORAGE_KEY = 'sd-utilities-prompts';

export function PromptsManager() {
  const api = useApi();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [newPromptName, setNewPromptName] = useState('New Prompt');

  // State for API data
  const [samplers, setSamplers] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loras, setLoras] = useState<any[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch API data only once on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Test API connection first
        const connected = await api.checkConnection();
        
        if (connected) {
          // Fetch all required data in parallel
          const [samplersData, modelsData, currentModelData, lorasData] = await Promise.all([
            api.api.getSamplers(),
            api.api.getModels(),
            api.api.getCurrentModel(),
            api.api.getLoras()
          ]);
          
          setSamplers(samplersData);
          setModels(modelsData);
          if (currentModelData) setCurrentModel(currentModelData);
          setLoras(lorasData);
        }
      } catch (error) {
        console.error("Error fetching API data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch once when component mounts
    fetchData();
  }, []); // Empty dependency array to prevent infinite loop

  // Add a manual refresh function in case you need to refresh the data
  const refreshApiData = async () => {
    setIsLoading(true);
    try {
      const connected = await api.checkConnection();
      
      if (connected) {
        const [samplersData, modelsData, currentModelData, lorasData] = await Promise.all([
          api.api.getSamplers(),
          api.api.getModels(),
          api.api.getCurrentModel(),
          api.api.getLoras()
        ]);
        
        setSamplers(samplersData);
        setModels(modelsData);
        if (currentModelData) setCurrentModel(currentModelData);
        setLoras(lorasData);
      }
    } catch (error) {
      console.error("Error refreshing API data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load prompts from local storage on initial render
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

  // Save prompts to local storage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  }, [prompts]);

  const handleAddPrompt = (prompt: Prompt) => {
    setPrompts((prevPrompts) => [...prevPrompts, {...prompt, name: newPromptName}]);
    setIsAddingPrompt(false);
    // Reset the new prompt name for next time
    setNewPromptName('New Prompt');
  };

  const handleUpdatePrompt = (updatedPrompt: Prompt) => {
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

  const toggleEditPrompt = (id: string) => {
    setEditingPromptId(currentId => currentId === id ? null : id);
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Prompt List</h2>
        <div className="flex gap-2">
          {api.isConnected && (
            <Button variant="outline" onClick={refreshApiData} disabled={isLoading}>
              Refresh Models & LoRAs
            </Button>
          )}
          <Button onClick={() => setIsAddingPrompt(!isAddingPrompt)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {isAddingPrompt ? 'Cancel' : 'Add Prompt'}
          </Button>
        </div>
      </div>

      {!api.isConnected && (
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>
            Not connected to the Stable Diffusion API. Go to the Execute tab to configure the connection.
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Card className="p-4 mb-4">
          <div className="text-center text-muted-foreground">Loading data from API...</div>
        </Card>
      )}

      {isAddingPrompt && (
        <Card className="mb-4 overflow-hidden">
          <Accordion type="single" collapsible defaultValue="new-prompt">
            <AccordionItem value="new-prompt" className="border-none">
              <div className="px-3 py-2 flex items-center justify-between border-b">
                <input
                  type="text"
                  value={newPromptName}
                  onChange={(e) => setNewPromptName(e.target.value)}
                  className="flex-1 text-sm font-medium bg-transparent border-none focus:outline-none"
                  placeholder="Enter prompt name"
                />
              </div>
              <AccordionContent>
                <div className="p-4">
                  <PromptForm 
                    onSubmit={handleAddPrompt} 
                    onCancel={() => setIsAddingPrompt(false)} 
                    availableSamplers={samplers}
                    availableModels={models}
                    availableLoras={loras}
                    currentModel={currentModel}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      )}

      <div className="space-y-3">
        {prompts.map((prompt) => (
          <PromptCard
            key={prompt.id}
            prompt={prompt}
            onEditToggle={() => toggleEditPrompt(prompt.id)}
            onDelete={() => handleDeletePrompt(prompt.id)}
            onMove={handleMovePrompt}
            isEditing={editingPromptId === prompt.id}
            onPromptUpdate={handleUpdatePrompt}
            availableSamplers={samplers}
            availableModels={models}
            availableLoras={loras}
            currentModel={currentModel}
          />
        ))}
      </div>

      {prompts.length === 0 && !isAddingPrompt && !isLoading && (
        <Card className="p-6 text-center text-muted-foreground">
          <p>No prompts added yet. Click "Add Prompt" to get started.</p>
        </Card>
      )}
    </div>
  );
}