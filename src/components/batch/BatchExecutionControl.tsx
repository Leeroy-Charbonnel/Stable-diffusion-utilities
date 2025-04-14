
// src/components/batch/BatchExecutionControl.tsx
import React from 'react';
import { useBatchExecution } from './BatchExecutionContext';
import { usePrompts } from '../../context/PromptContext';
import { Button } from '../ui/button';
import { Play, Square, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { BatchStatus } from './BatchStatus';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

export const BatchExecutionControl: React.FC = () => {
  const { progress, startBatch, cancelBatch } = useBatchExecution();
  const { prompts } = usePrompts();
  
  //Calculate total number of generations
  const totalGenerations = prompts.reduce((total, prompt) => {
    return total + prompt.runCount;
  }, 0);
  
  //Estimate time (rough estimate: ~10 seconds per generation)
  const estimatedTimeSeconds = totalGenerations * 10;
  const estimatedTimeFormatted = formatTime(estimatedTimeSeconds);
  
  //Format time helper
  function formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Execution</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Prompts:</p>
              <p className="font-medium">{prompts.length}</p>
            </div>
            
            <div className="text-sm">
              <p className="text-muted-foreground">Total Generations:</p>
              <p className="font-medium">{totalGenerations}</p>
            </div>
            
            <div className="text-sm">
              <p className="text-muted-foreground">Estimated Time:</p>
              <p className="font-medium">{estimatedTimeFormatted}</p>
            </div>
            
            <div className="text-sm">
              <p className="text-muted-foreground">Status:</p>
              <p className="font-medium capitalize">{progress.status}</p>
            </div>
          </div>
          
          {progress.isRunning && <BatchStatus />}
          
          {progress.status === 'error' && (
            <div className="bg-destructive/10 p-4 rounded-md flex items-start gap-2">
              <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-medium text-destructive">Error occurred</p>
                <p className="text-sm">{progress.error || 'Unknown error'}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {!progress.isRunning ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                disabled={prompts.length === 0 || progress.status === 'running'}
                className="w-full"
              >
                <Play size={16} className="mr-2" /> Start Batch
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start Batch Generation</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to generate {totalGenerations} image{totalGenerations !== 1 ? 's' : ''} which will take approximately {estimatedTimeFormatted}.
                  Make sure your Stable Diffusion WebUI is running and accessible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => startBatch()}>
                  Start Generation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button 
            variant="destructive" 
            onClick={cancelBatch}
            className="w-full"
          >
            <Square size={16} className="mr-2" /> Cancel Batch
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

