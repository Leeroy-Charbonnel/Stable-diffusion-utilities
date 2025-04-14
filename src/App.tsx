// src/App.tsx
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptsManager } from './components/PromptsManager';
import { BatchExecutor } from './components/BatchExecutor';
import { ImageViewer } from './components/ImageViewer';
import { ApiProvider } from './contexts/ApiContext';

function App() {
  return (
    <ApiProvider>
      <div className="min-h-screen p-4 bg-background text-foreground dark">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Stable Diffusion Utilities</h1>
          <p className="text-muted-foreground">
            Manage prompts, generate images, and view your gallery
          </p>
        </header>
        
        <Tabs defaultValue="prompts">
          <TabsList className="mb-4">
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="execute">Execute</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>
          
          <TabsContent value="prompts">
            <PromptsManager />
          </TabsContent>
          
          <TabsContent value="execute">
            <BatchExecutor />
          </TabsContent>
          
          <TabsContent value="images">
            <ImageViewer />
          </TabsContent>
        </Tabs>
      </div>
    </ApiProvider>
  );
}

export default App;