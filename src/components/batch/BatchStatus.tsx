// src/components/batch/BatchStatus.tsx
import React from 'react';
import { useBatchExecution, BatchProgress } from './BatchExecutionContext';
import { Progress } from '../ui/progress';

export const BatchStatus: React.FC = () => {
  const { progress } = useBatchExecution();
  
  const formatProgressText = (progress: BatchProgress) => {
    if (!progress.isRunning) return '';
    
    return `Processing prompt ${progress.currentPromptIndex + 1}/${progress.totalPrompts} - Run ${progress.currentRun}/${progress.totalRuns}`;
  };

  return (
    <div className="space-y-2">
      <Progress value={progress.progress} className="w-full" />
      
      <div className="text-sm flex justify-between">
        <span className="text-muted-foreground">{formatProgressText(progress)}</span>
        <span className="font-medium">{Math.round(progress.progress)}%</span>
      </div>
      
      {progress.currentPrompt && (
        <div className="text-xs text-muted-foreground mt-1">
          <span className="font-medium">Current prompt:</span> {progress.currentPrompt.substring(0, 100)}{progress.currentPrompt.length > 100 ? '...' : ''}
        </div>
      )}
    </div>
  );
};
