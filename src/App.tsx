// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { GalleryPage } from './pages/GalleryPage';
import { SettingsPage } from './pages/SettingsPage';
import { PromptProvider } from './context/PromptContext';
import { ImageProvider } from './context/ImageContext';
import { BatchExecutionProvider } from './components/batch/BatchExecutionContext';

const App: React.FC = () => {
  return (
    <Router>
      <PromptProvider>
        <ImageProvider>
          <BatchExecutionProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BatchExecutionProvider>
        </ImageProvider>
      </PromptProvider>
    </Router>
  );
};

export default App;
