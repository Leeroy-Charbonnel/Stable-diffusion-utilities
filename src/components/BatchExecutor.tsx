// src/components/BatchExecutor.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, XCircle, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { Prompt } from '@/types';

type ExecutionStatus = 'idle' | 'executing' | 'completed' | 'failed';

export function BatchExecutor() {
  const { 
    isConnected, 
    checkConnection, 
    isLoading: apiLoading,
    error: apiError,
    generateImage,
    availableModels,
    currentModel,
    setModel
  } = useApi();
  
  const [apiUrl, setApiUrl] = useState<string>('http://localhost:7860');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  //Load prompts from local storage
  useEffect(() => {
    const storedPrompts = localStorage.getItem('sd-utilities-prompts');
    if (storedPrompts) {
      setPrompts(JSON.parse(storedPrompts));
    }
  }, []);

  //Update total steps when prompts change
  useEffect(() => {
    const total = prompts.reduce((acc, prompt) => acc + prompt.runCount, 0);
    setTotalSteps(total);
  }, [prompts]);

  //Handle API URL change
  const handleApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiUrl(e.target.value);
  };

  //Test the connection to the API
  const handleTestConnection = async () => {
    setError(null);
    
    //Update the API URL first
    const apiContext = useApi();
    apiContext.api.setBaseUrl(apiUrl);
    
    //Then test the connection
    const connected = await checkConnection();
    if (connected) {
      //Save the URL to local storage if successful
      localStorage.setItem('sd-utilities-api-url', apiUrl);
    }
  };

  //Execute a single prompt with the specified count
  const executePrompt = async (prompt: Prompt): Promise<number> => {
    let successfulRuns = 0;
    
    for (let i = 0; i < prompt.runCount; i++) {
      try {
        const result = await generateImage(prompt);
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

  //Execute all prompts
  const handleExecute = async () => {
    if (!isConnected) {
      setError("Not connected to API. Please check connection settings.");
      return;
    }
    
    if (prompts.length === 0) {
      setError("No prompts to execute. Please add prompts first.");
      return;
    }
    
    setStatus('executing');
    setProgress(0);
    setCurrentStep(0);
    setSuccessCount(0);
    setFailureCount(0);
    setError(null);
    
    let totalSuccessful = 0;
    
    try {
      for (const prompt of prompts) {
        if (status !== 'executing') break; //Check if execution was cancelled
        
        const successfulRuns = await executePrompt(prompt);
        totalSuccessful += successfulRuns;
      }
      
      setStatus('completed');
    } catch (err) {
      console.error('Error during batch execution:', err);
      setError(`Error during execution: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('failed');
    }
  };

  const handleCancel = () => {
    setStatus('idle');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Batch Execution</h2>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl">Stable Diffusion API URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="apiUrl" 
                  value={apiUrl} 
                  onChange={handleApiUrlChange} 
                  placeholder="http://localhost:7860"
                />
                <Button onClick={handleTestConnection} disabled={apiLoading}>
                  <Settings className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
              </div>
            </div>
            
            {apiLoading && (
              <div className="text-muted-foreground">Testing connection...</div>
            )}
            
            {isConnected && !apiError && (
              <>
                <Alert className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Connected</AlertTitle>
                  <AlertDescription>
                    Successfully connected to Stable Diffusion API.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="modelSelect">Active Model</Label>
                  <div className="flex gap-2">
                    <Select
                      value={currentModel}
                      onValueChange={(value) => setModel(value)}
                      disabled={apiLoading}
                    >
                      <SelectTrigger id="modelSelect" className="flex-1">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            
            {apiError && (
              <Alert variant="destructive" className="bg-destructive/10 text-destructive dark:bg-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription className="mt-1 text-sm">{apiError}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Execute All Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            This will execute all prompts in your list with their configured settings.
          </p>
          
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
              
              <Button variant="destructive" onClick={handleCancel}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Execution
              </Button>
            </div>
          ) : status === 'completed' ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-900/30">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Execution Completed</AlertTitle>
                <AlertDescription className="mt-1">
                  Generated {successCount} images successfully. {failureCount} failed.
                </AlertDescription>
              </Alert>
              
              <Button onClick={() => setStatus('idle')}>
                Start New Execution
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-destructive/10 text-destructive dark:bg-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription className="mt-1 text-sm">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="text-sm text-muted-foreground">
                {totalSteps === 0 ? (
                  <p>No prompts added yet. Add prompts in the Prompts tab before executing.</p>
                ) : (
                  <p>Ready to generate {totalSteps} images from {prompts.length} prompts.</p>
                )}
              </div>
              
              <Button onClick={handleExecute} disabled={!isConnected || totalSteps === 0}>
                <Play className="mr-2 h-4 w-4" />
                Start Execution
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}