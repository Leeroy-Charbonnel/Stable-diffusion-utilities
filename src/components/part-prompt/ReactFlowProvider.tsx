// src/components/part-prompt/ReactFlowProvider.tsx
import React from 'react';
import { ReactFlowProvider as BaseReactFlowProvider } from 'reactflow';

export function ReactFlowProvider({ children }: { children: React.ReactNode }) {
  return <BaseReactFlowProvider>{children}</BaseReactFlowProvider>;
}