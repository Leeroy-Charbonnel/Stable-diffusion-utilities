// src/App.tsx
import { useState, useEffect } from 'react';
import { PromptsManager } from './components/PromptsManager';
import { ImageViewer } from './components/ImageViewer';
import { ApiProvider, useApi } from './contexts/ApiContext';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Image, ListChecks } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';

function App() {
  const [activeTab, setActiveTab] = useState<'prompts' | 'images'>(
    () => {
      const savedTab = localStorage.getItem('sd-utilities-activeTab');
      return (savedTab === 'images' ? 'images' : 'prompts');
    }
  );



  const {
    isConnected,
    error: apiError,
  } = useApi();



  useEffect(() => {
    localStorage.setItem('sd-utilities-activeTab', activeTab);
  }, [activeTab]);

  const tabComponents = {
    prompts: <PromptsManager />,
    images: <ImageViewer />
  };

  return (
    <ApiProvider>
      <div className="min-h-screen bg-background text-foreground dark flex">
        <div className="w-64 border-r border-border h-screen flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-bold">SD Utilities</h1>
            <p className="text-xs text-muted-foreground">Stable Diffusion Tools</p>
          </div>

          <nav className="flex flex-col p-2 gap-1">
            <Button
              variant={activeTab === 'prompts' ? 'default' : 'ghost'}
              className="justify-start"
              onClick={() => setActiveTab('prompts')}
              data-tab="prompts"
            >
              <ListChecks className="mr-2 h-4 w-4" />
              Prompts
            </Button>

            <Button
              variant={activeTab === 'images' ? 'default' : 'ghost'}
              className="justify-start"
              onClick={() => setActiveTab('images')}
              data-tab="images"
            >
              <Image className="mr-2 h-4 w-4" />
              Images
            </Button>
          </nav>




          {/* Connection Status */}
          {isConnected ? (
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
                {apiError || "Not connected to the Stable Diffusion API. Check your connection settings."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {tabComponents[activeTab]}
          </div>
        </div>
      </div>
    </ApiProvider>
  );
}

export default App;