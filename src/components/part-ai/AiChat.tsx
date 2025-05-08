import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Send, RefreshCw, Trash2, AlertCircle, Image } from 'lucide-react';
import { useAi } from '@/contexts/contextAI';
import { ChatMessage } from '@/types';
import { AiSettingsModal } from './AiSettingsModal';
import { Badge } from '../ui/badge';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';

export function AiChat() {
  const {
    messages,
    isProcessing,
    error,
    settings,

    sendMessage,
    clearMessages,
  } = useAi();



  const [inputMessage, setInputMessage] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  //Focus input when not processing
  useEffect(() => {
    if (inputRef.current && !isProcessing) {
      inputRef.current.focus();
    }
  }, [isProcessing]);


  const handleSendMessage = async () => {
    if (inputMessage.trim() && !isProcessing) {
      await sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  //Render individual message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    if (isSystem) return null;

    return (
      <div
        key={message.id}
        className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`rounded-lg p-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`} >
            <div className="text-sm whitespace-pre-wrap break-words">{JSON.parse(message.content).message}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="absolute right-2 items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} >
          <Settings className="h-5 w-5" />
        </Button>
      </div>




      <ResizablePanelGroup
        direction="horizontal"
        className="h-screen border"
      >
        <ResizablePanel defaultSize={50} className='flex flex-col'>
          <div className="flex items-center justify-between p-2">
            <Badge variant={"secondary"}>{settings.model}</Badge>

            {messages.filter(m => m.role !== 'system').length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {messages.filter(m => m.role !== 'system').length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <div className="p-4">
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-2 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for prompt ideas or paste a Civitai image URL..."
                className="min-h-[50px] resize-none"
                disabled={isProcessing}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="h-10 w-10 p-0"
              >
                {isProcessing ?
                  <RefreshCw className="h-4 w-4 animate-spin" /> :
                  <Send className="h-4 w-4" />
                }
              </Button>
            </div>

            {/* Input Helpers */}
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputMessage("Create a detailed Stable Diffusion prompt for ");
                  inputRef.current?.focus();
                }}
                className="text-xs"
              >
                <Image className="h-3 w-3 mr-1" />
                New Prompt Template
              </Button>
            </div>
          </div>

        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>





        </ResizablePanel>
      </ResizablePanelGroup>












      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Settings Modal */}
      <AiSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

