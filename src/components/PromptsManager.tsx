// src/components/PromptsManager.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, InfoIcon, Play, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Prompt } from '@/types';
import { PromptForm } from './PromptForm';
import { PromptCard } from './PromptCard';
import { useApi } from '@/contexts/ApiContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STORAGE_KEY = 'sd-utilities-prompts';

type ExecutionStatus = 'idle' | 'executing' | 'completed' | 'failed';

//Helper function to save prompts to localStorage
const savePromptsToStorage = (prompts: Prompt[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
};

export function PromptsManager() {
  const api = useApi();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [newPromptName, setNewPromptName] = useState('New Prompt');
  
  // Execution state
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [executingPrompts, setExecutingPrompts] = useState<Prompt[]>([]);
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);

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

  const handleAddPrompt = (prompt: Prompt) => {
    const updatedPrompts = [...prompts, {...prompt, name: newPromptName}];
    setPrompts(updatedPrompts);
    // Immediately save to localStorage
    savePromptsToStorage(updatedPrompts);
    setIsAddingPrompt(false);
    // Reset the new prompt name for next time
    setNewPromptName('New Prompt');
  };

  const handleUpdatePrompt = (updatedPrompt: Prompt) => {
    const updatedPrompts = prompts.map((p) => 
      (p.id === updatedPrompt.id ? updatedPrompt : p)
    );
    setPrompts(updatedPrompts);
    // Immediately save to localStorage
    savePromptsToStorage(updatedPrompts);
    setEditingPromptId(null);
  };

  const handleDeletePrompt = (id: string) => {
    const updatedPrompts = prompts.filter((p) => p.id !== id);
    setPrompts(updatedPrompts);
    // Immediately save to localStorage
    savePromptsToStorage(updatedPrompts);
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
    // Immediately save to localStorage
    savePromptsToStorage(newPrompts);
  };

  const toggleEditPrompt = (id: string) => {
    setEditingPromptId(currentId => currentId === id ? null : id);
  };
  
  // Execution related functions
  //Execute a single prompt with the specified count
  const executePrompt = async (prompt: Prompt): Promise<number> => {
    let successfulRuns = 0;
    
    for (let i = 0; i < prompt.runCount; i++) {
      try {
        const result = await api.generateImage(prompt);
        if (result) {
          successfulRuns++;
          setSuccessCount(prev => prev + 1);
        } else {
          setFailureCount(prev => prev + 1);
        }
      } catch (err) {
        console.error(`Error running prompt ${prompt.id} (${i + 1}/${prompt.runCount}):`, err);
        setFailureCount(prev => prev + 1);
      }
      
      //Update progress
      setCurrentStep(prev => prev + 1);
      const newProgress = ((currentStep + 1) / totalSteps) * 100;
      setProgress(newProgress);
    }
    
    return successfulRuns;
  };
  
  //Handle execution of all prompts
  const handleExecuteAll = async () => {
    if (!api.isConnected) {
      setError("Not connected to API. Please check connection.");
      return;
    }
    
    if (prompts.length === 0) {
      setError("No prompts to execute. Please add prompts first.");
      return;
    }
    
    // Calculate total steps
    const total = prompts.reduce((acc, prompt) => acc + prompt.runCount, 0);
    setTotalSteps(total);
    
    // Start execution
    setStatus('executing');
    setProgress(0);
    setCurrentStep(0);
    setSuccessCount(0);
    setFailureCount(0);
    setError(null);
    setExecutingPrompts([...prompts]);
    setExecutionDialogOpen(true);
    
    try {
      for (const prompt of prompts) {
        if (status !== 'executing') break; // Check if execution was cancelled
        
        await executePrompt(prompt);
      }
      
      setStatus('completed');
    } catch (err) {
      console.error('Error during batch execution:', err);
      setError(`Error during execution: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('failed');
    }
  };

  // Handle execution of a single prompt
  const handleExecutePrompt = async (promptToExecute: Prompt) => {
    if (!api.isConnected) {
      setError("Not connected to API. Please check connection.");
      return;
    }
    
    // Set up execution for just this prompt
    setTotalSteps(promptToExecute.runCount);
    setStatus('executing');
    setProgress(0);
    setCurrentStep(0);
    setSuccessCount(0);
    setFailureCount(0);
    setError(null);
    setExecutingPrompts([promptToExecute]);
    setExecutionDialogOpen(true);
    
    try {
      await executePrompt(promptToExecute);
      setStatus('completed');
    } catch (err) {
      console.error('Error during prompt execution:', err);
      setError(`Error during execution: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('failed');
    }
  };

  const handleCancelExecution = () => {
    setStatus('idle');
  };

  const closeExecutionDialog = () => {
    if (status !== 'executing') {
      setExecutionDialogOpen(false);
      setStatus('idle');
    }
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Prompt List</h2>
        <div className="flex gap-2">
          <Button 
            onClick={handleExecuteAll} 
            disabled={!api.isConnected || prompts.length === 0}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Execution
          </Button>
          <Button onClick={() => setIsAddingPrompt(!isAddingPrompt)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {isAddingPrompt ? 'Cancel' : 'Add Prompt'}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      {api.isConnected ? (
        <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Connected</AlertTitle>
          <AlertDescription>
            Successfully connected to Stable Diffusion API.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-4 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>
            {api.error || "Not connected to the Stable Diffusion API. Check your connection settings."}
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
            onRunPrompt={handleExecutePrompt}
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

      {/* Execution Dialog */}
      <Dialog open={executionDialogOpen} onOpenChange={closeExecutionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {status === 'executing' 
                ? 'Executing Prompts...' 
                : status === 'completed' 
                  ? 'Execution Complete' 
                  : status === 'failed' 
                    ? 'Execution Failed' 
                    : 'Prompt Execution'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {status === 'executing' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress: {currentStep} of {totalSteps} images</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
                
                <div className="flex gap-4 text-sm">
                  <div>Success: {successCount}</div>
                  <div>Failed: {failureCount}</div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {executingPrompts.length === 1 
                    ? `Executing prompt "${executingPrompts[0].name}"` 
                    : `Executing ${executingPrompts.length} prompts`}
                </div>
              </div>
            ) : status === 'completed' ? (
              <Alert className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-900/30">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Execution Completed</AlertTitle>
                <AlertDescription className="mt-1">
                  Generated {successCount} images successfully. {failureCount} failed.
                </AlertDescription>
              </Alert>
            ) : status === 'failed' ? (
              <Alert variant="destructive" className="bg-destructive/10 text-destructive dark:bg-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="mt-1 text-sm">{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          
          <DialogFooter>
            {status === 'executing' ? (
              <Button variant="destructive" onClick={handleCancelExecution}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Execution
              </Button>
            ) : (
              <Button onClick={closeExecutionDialog}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}