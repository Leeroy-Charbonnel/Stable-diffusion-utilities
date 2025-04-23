// src/App.tsx
import { useState, useEffect } from 'react';
import { PromptsManager } from '@/components/part-prompt/PromptsManager';
import { ImageViewer } from '@/components/part-images/ImageViewer';
import { AiChat } from '@/components/part-ai/AiChat';
import { SdProvider } from '@/contexts/contextSD';
import { AiProvider } from '@/contexts/contextAI';
import { PromptProvider } from '@/contexts/contextPrompts';
import { Sidebar } from '@/components/Sidebar';
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
  const [newImageNumber, setNewImageNumber] = useState(0);

  useEffect(() => {
    localStorage.setItem('sd-utilities-activeTab', activeTab);
  }, [activeTab]);


  //Listen for image-saved events to refresh the image list (for automatic refresh after execution)
  useEffect(() => {
    const handleImageSaved = () => {
      if (activeTab != 'images') setNewImageNumber(newImageNumber + 1);
    };

    window.addEventListener('image-saved', handleImageSaved);
    return () => { window.removeEventListener('image-saved', handleImageSaved); };
  }, []);

  return (
    <SdProvider>
      <PromptProvider>
        <AiProvider>

          <div className="min-h-screen bg-background text-foreground dark flex overflow-hidden">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} newImageNumber={newImageNumber} />

            <div className="w-full h-screen">
              <div className="p-6 h-full">
                <div className="h-full" style={{ display: activeTab === 'prompts' ? 'block' : 'none' }}><PromptsManager /></div>
                <div className="h-full" style={{ display: activeTab === 'images' ? 'block' : 'none' }}><ImageViewer isActiveTab={activeTab === 'images'} /></div>
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