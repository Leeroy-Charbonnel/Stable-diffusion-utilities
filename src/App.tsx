// src/App.tsx
import { useState, useEffect } from 'react';
import { PromptsManager } from '@/components/part-prompt/PromptsManager';
import { ImageViewer } from '@/components/part-images/ImageViewer';
import { AiChat } from '@/components/part-ai/AiChat';
import { SdProvider } from '@/contexts/contextSD';
import { AiProvider } from '@/contexts/contextAI';
import { PromptProvider } from '@/contexts/contextPrompts';
import { AppSidebar } from '@/components/Sidebar';
import { Toaster } from 'sonner';

function App() {
  const [activeTab, setActiveTab] = useState<'prompts' | 'images' | 'ai'>(
    () => {
      const savedTab = localStorage.getItem('sd-utilities-activeTab');
      if (savedTab === 'images') return 'images';
      if (savedTab === 'ai') return 'ai';
      return 'prompts';
    }
  );
  const [newImageNumber, setNewImageNumber] = useState(10);

  useEffect(() => {
    localStorage.setItem('sd-utilities-activeTab', activeTab);
    if (activeTab === 'images') {
      setNewImageNumber(0);
    }
  }, [activeTab]);


  //Listen for image-saved events to refresh the image list (for automatic refresh after execution)
  // Replace the current useEffect for the 'image-saved' event with these two effects
  useEffect(() => {
    const handleImageSaved = () => {
      if (activeTab !== 'images') {
        setNewImageNumber(prev => prev + 1);
      }
    };

    window.addEventListener('image-saved', handleImageSaved);
    return () => { window.removeEventListener('image-saved', handleImageSaved); };
  }, [activeTab]);


  return (
    <SdProvider>
      <PromptProvider>
        <AiProvider>

          <div className="min-h-screen bg-background text-foreground dark flex overflow-hidden">
            <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} newImageNumber={newImageNumber} />

            <div className="w-full h-screen">
              <div className="h-full">
                <div className="h-full" style={{ display: activeTab === 'prompts' ? 'block' : 'none' }}><PromptsManager /></div>
                <div className="h-full" style={{ display: activeTab === 'images' ? 'block' : 'none' }}><ImageViewer /></div>
                <div className="h-full" style={{ display: activeTab === 'ai' ? 'block' : 'none' }}><AiChat /></div>
              </div>
            </div>
          </div>
          <Toaster />
        </AiProvider>
      </PromptProvider>
    </SdProvider>
  );
}

export default App;