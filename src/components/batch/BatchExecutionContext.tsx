// src/components/batch/BatchExecutionContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PromptConfig } from '../../types/prompt';
import { ImageMetadata } from '../../types/image';
import { apiClient, SDApiClient } from '../../lib/api';
import { promptConfigToApiParams, createFilenameFromPrompt } from '../../lib/utils';
import { usePrompts } from '../../context/PromptContext';
import { useImages } from '../../context/ImageContext';

interface BatchJob {
  promptConfig: PromptConfig;
  runIndex: number;
  totalRuns: number;
}

export interface BatchProgress {
  isRunning: boolean;
  currentPrompt: string;
  currentPromptIndex: number;
  totalPrompts: number;
  currentRun: number;
  totalRuns: number;
  progress: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  error?: string;
}

interface BatchExecutionContextType {
  progress: BatchProgress;
  startBatch: () => Promise<void>;
  cancelBatch: () => void;
}

const initialProgress: BatchProgress = {
  isRunning: false,
  currentPrompt: '',
  currentPromptIndex: 0,
  totalPrompts: 0,
  currentRun: 0,
  totalRuns: 0,
  progress: 0,
  status: 'idle',
};

const BatchExecutionContext = createContext<BatchExecutionContextType | undefined>(undefined);

export const BatchExecutionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<BatchProgress>(initialProgress);
  const [cancelRequested, setCancelRequested] = useState(false);
  const { prompts } = usePrompts();
  const { addImage } = useImages();

  //Create a batch queue from prompts
  const createBatchQueue = (prompts: PromptConfig[]): BatchJob[] => {
    const queue: BatchJob[] = [];
    
    prompts.forEach(prompt => {
      for (let i = 0; i < prompt.runCount; i++) {
        queue.push({
          promptConfig: prompt,
          runIndex: i + 1,
          totalRuns: prompt.runCount,
        });
      }
    });
    
    return queue;
  };

  //Process a single job
  const processJob = async (job: BatchJob): Promise<ImageMetadata> => {
    const { promptConfig, runIndex } = job;
    
    //Convert PromptConfig to API parameters
    const apiParams = promptConfigToApiParams(promptConfig);
    
    //If seed is -1, generate a random seed for each run
    if (apiParams.seed === -1) {
      apiParams.seed = Math.floor(Math.random() * 2147483647);
    }
    
    //Generate the image
    const response = await apiClient.generateImages(apiParams);
    
    //Extract the first image (batch_size is set to 1)
    const base64Image = response.images[0];
    const imageBlob = SDApiClient.base64ToBlob(base64Image);
    
    //Create a filename based on the prompt
    const filename = createFilenameFromPrompt(promptConfig.prompt);
    
    //Create a local URL for the blob
    const imageUrl = URL.createObjectURL(imageBlob);
    
    //Return the image metadata
    return {
      id: '', //Will be assigned by the context
      filename,
      path: imageUrl, //Using object URL as path
      prompt: promptConfig.prompt,
      negativePrompt: promptConfig.negativePrompt || '',
      seed: apiParams.seed,
      steps: apiParams.steps!,
      sampler: apiParams.sampler_name!,
      width: apiParams.width!,
      height: apiParams.height!,
      cfgScale: apiParams.cfg_scale!,
      tags: [], //Empty tags initially
      createdAt: new Date().toISOString(),
      otherParams: promptConfig.otherParams,
    };
  };

  //Start batch processing
  const startBatch = async () => {
    //Don't start if already running
    if (progress.isRunning) return;
    
    //Reset cancel flag
    setCancelRequested(false);
    
    //Create batch queue
    const queue = createBatchQueue(prompts);
    const totalJobs = queue.length;
    
    if (totalJobs === 0) {
      setProgress({
        ...initialProgress,
        status: 'completed',
      });
      return;
    }
    
    //Set initial progress
    setProgress({
      isRunning: true,
      currentPrompt: '',
      currentPromptIndex: 0,
      totalPrompts: prompts.length,
      currentRun: 0,
      totalRuns: totalJobs,
      progress: 0,
      status: 'running',
    });
    
    //Process jobs sequentially
    let completedJobs = 0;
    
    for (let i = 0; i < queue.length; i++) {
      //Check if cancellation was requested
      if (cancelRequested) {
        setProgress(prev => ({
          ...prev,
          isRunning: false,
          status: 'idle',
        }));
        break;
      }
      
      const job = queue[i];
      const { promptConfig, runIndex, totalRuns } = job;
      
      //Update progress
      setProgress(prev => ({
        ...prev,
        currentPrompt: promptConfig.prompt,
        currentPromptIndex: prompts.findIndex(p => p.id === promptConfig.id),
        currentRun: runIndex,
        totalRuns,
        progress: (completedJobs / totalJobs) * 100,
      }));
      
      try {
        //Process the job
        const imageMetadata = await processJob(job);
        
        //Add the image to the store
        addImage(imageMetadata);
        
        //Increment completed jobs
        completedJobs++;
      } catch (error) {
        console.error('Error processing job:', error);
        
        //Update progress with error
        setProgress(prev => ({
          ...prev,
          isRunning: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        
        //Break the loop on error
        break;
      }
    }
    
    //If all jobs completed successfully and no cancellation
    if (!cancelRequested && completedJobs === totalJobs) {
      setProgress(prev => ({
        ...prev,
        isRunning: false,
        progress: 100,
        status: 'completed',
      }));
    }
  };

  //Cancel batch processing
  const cancelBatch = () => {
    if (!progress.isRunning) return;
    setCancelRequested(true);
  };

  return (
    <BatchExecutionContext.Provider value={{ progress, startBatch, cancelBatch }}>
      {children}
    </BatchExecutionContext.Provider>
  );
};

export const useBatchExecution = () => {
  const context = useContext(BatchExecutionContext);
  if (context === undefined) {
    throw new Error('useBatchExecution must be used within a BatchExecutionProvider');
  }
  return context;
};
