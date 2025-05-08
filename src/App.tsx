// src/App.tsx
import { useState, useEffect } from 'react';
import { ImageViewer } from '@/components/part-images/ImageViewer';
import { AiChat } from '@/components/part-ai/AiChat';
import { AiProvider } from '@/contexts/contextAI';
import { AppSidebar } from '@/components/Sidebar';
import { Toaster } from 'sonner';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'images' | 'ai'>(
    () => {
      const savedTab = localStorage.getItem('sd-utilities-activeTab');
      if (savedTab === 'images') return 'images';
      return 'ai';
    }
  );

  useEffect(() => {
    localStorage.setItem('sd-utilities-activeTab', activeTab);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background text-foreground dark flex overflow-hidden">
      <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="w-full h-screen">
        <div className="h-full">
          <div className="h-full" style={{ display: activeTab === 'images' ? 'block' : 'none' }}> <ImageViewer isActiveTab={activeTab === 'images'} /></div>
          <div className="h-full" style={{ display: activeTab === 'ai' ? 'block' : 'none' }}><AiChat /></div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AiProvider>
      <AppContent />
    </AiProvider>
  );
}

export default App;