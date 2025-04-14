// src/components/BatchExecutor.tsx with improved connection test
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Play, XCircle, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { apiService } from '@/services/api'; // Import directly for setting base URL
import { Prompt } from '@/types';

type ExecutionStatus = 'idle' | 'executing' | 'completed' | 'failed';

export function BatchExecutor() {
  const {
    isConnected,
    checkConnection,
    isLoading: apiLoading,
    error: apiError,
    generateImage,
    availableSamplers
  } = useApi();

  const [apiUrl, setApiUrl] = useState<string>(() => {
    // Initialize from localStorage or default
    return localStorage.getItem('sd-utilities-api-url') || 'http://localhost:7860';
  });
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

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
    // Reset connection status when URL changes
    setConnectionSuccess(false);
  };

  //Test the connection to the API
  const handleTestConnection = async () => {
    setError(null);
    setTestingConnection(true);
    setConnectionSuccess(false);

    try {
      // Set the API base URL directly on the service
      apiService.setBaseUrl(apiUrl);

      // Directly test connection with the API service
      const connected = await apiService.testConnection();

      if (connected) {
        // Successfully connected
        setConnectionSuccess(true);

        // Get samplers to verify complete access
        const samplers = await apiService.getSamplers();

        if (samplers && samplers.length > 0) {
          console.log("Available samplers:", samplers);
        }

        // Save the URL to local storage
        localStorage.setItem('sd-utilities-api-url', apiUrl);

        // Trigger context update
        await checkConnection();
      } else {
        setError("Could not connect to the API. Please check the URL and ensure the Stable Diffusion server is running.");
      }
    } catch (err) {
      setError(`Connection test failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTestingConnection(false);
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
    if (!isConnected && !connectionSuccess) {
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
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">API Configuration</CardTitle>
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
                <Button
                  onClick={handleTestConnection}
                  disabled={apiLoading || testingConnection}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {testingConnection ? "Testing..." : "Test Connection"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure the Stable Diffusion WebUI is running with the <code>--api</code> flag.
              </p>
            </div>

            {(apiLoading || testingConnection) && (
              <div className="text-muted-foreground">Testing connection...</div>
            )}

            {(isConnected || connectionSuccess) && !apiError && !testingConnection && (
              <Alert className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Connected</AlertTitle>
                <AlertDescription>
                  Successfully connected to Stable Diffusion API.
                  {availableSamplers.length > 0 &&
                    ` Found ${availableSamplers.length} available samplers.`
                  }
                </AlertDescription>
              </Alert>
            )}

            {(apiError || error) && !testingConnection && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>{apiError || error}</AlertDescription>
                <div className="mt-2 text-sm">
                  <p>Make sure:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>The Stable Diffusion WebUI is running</li>
                    <li>It was started with the <code>--api</code> flag</li>
                    <li>The URL is correct (usually http://localhost:7860)</li>
                    <li>Your browser has access to the API</li>
                  </ul>
                </div>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Execute All Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
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
              <Alert className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Execution Completed</AlertTitle>
                <AlertDescription>
                  Generated {successCount} images successfully. {failureCount} failed.
                </AlertDescription>
              </Alert>

              <Button onClick={() => setStatus('idle')}>
                Start New Execution
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && !error.includes("Connection") && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground">
                {totalSteps === 0 ? (
                  <p>No prompts added yet. Add prompts in the Prompts tab before executing.</p>
                ) : (
                  <p>Ready to generate {totalSteps} images from {prompts.length} prompts.</p>
                )}
              </div>

              <Button
                onClick={handleExecute}
                disabled={(!isConnected && !connectionSuccess) || totalSteps === 0}
              >
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