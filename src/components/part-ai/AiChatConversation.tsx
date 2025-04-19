import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  BrainCog,
  Send,
  RefreshCw,
  Trash2,
  Image,
  User,
  Bot,
  ListChecks,
  Wand2,
  CheckCircle,
  PlusCircle
} from 'lucide-react';
import { useAi } from '@/contexts/AiContext';
import { ChatMessage, Prompt } from '@/types';
import { useApi } from '@/contexts/ApiContext';
import { generateUUID } from '@/lib/utils';
import { PromptForm } from '../part-prompt/PromptForm';
import { generateChatCompletion } from '@/services/openAiApi';
import { CHAT_SYSTEM_PROMPT, EXTRACTION_PROMPT } from '@/lib/constantsAI';
import { DEFAULT_AI_API_KEY } from '@/lib/constantsKeys';

export function AiChatConversation() {
  const { messages, isProcessing, error, settings, sendMessage, clearMessages } = useAi();
  const { promptsApi, stableDiffusionApi } = useApi();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  //Prompt creation state
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<Prompt | null>(null);
  const [availableSamplers, setAvailableSamplers] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableLoras, setAvailableLoras] = useState<any[]>([]);
  const [isLoadingApiData, setIsLoadingApiData] = useState(false);
  const [isExtractingPrompt, setIsExtractingPrompt] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  //Load API data for the prompt form
  useEffect(() => {
    const loadApiData = async () => {
      setIsLoadingApiData(true);
      try {
        const [samplers, models, loras] = await Promise.all([
          stableDiffusionApi.getSamplers(),
          stableDiffusionApi.getModels(),
          stableDiffusionApi.getLoras()
        ]);

        setAvailableSamplers(samplers);
        setAvailableModels(models);
        setAvailableLoras(loras);
      } catch (error) {
        console.error('Failed to load API data:', error);
      } finally {
        setIsLoadingApiData(false);
      }
    };

    loadApiData();
  }, []);

  //Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    //Check the last assistant message for JSON data
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      const lastMessage = messages[messages.length - 1].content;
      extractPromptFromMessage(lastMessage);
    }
  }, [messages]);

  //Focus input when not processing
  useEffect(() => {
    if (inputRef.current && !isProcessing) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  //Initialize chat with system message if empty
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage(CHAT_SYSTEM_PROMPT, 'system');
    }
  }, []);

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

  //Find best match for model name in available models
  const findBestModelMatch = (modelName: string): string => {
    if (!modelName || availableModels.length === 0) return availableModels[0] || '';

    //Try exact match first
    if (availableModels.includes(modelName)) return modelName;

    //Try partial match (case insensitive)
    const lowerModelName = modelName.toLowerCase();
    for (const availableModel of availableModels) {
      if (availableModel.toLowerCase().includes(lowerModelName) ||
        lowerModelName.includes(availableModel.toLowerCase())) {
        return availableModel;
      }
    }

    //Default to first available model
    return availableModels[0] || '';
  };

  //Find best match for sampler name in available samplers
  const findBestSamplerMatch = (samplerName: string): string => {
    if (!samplerName || availableSamplers.length === 0) return 'Euler a';

    //Try exact match first
    if (availableSamplers.includes(samplerName)) return samplerName;

    //Try partial match (case insensitive)
    const lowerSamplerName = samplerName.toLowerCase();
    for (const availableSampler of availableSamplers) {
      if (availableSampler.toLowerCase().includes(lowerSamplerName) ||
        lowerSamplerName.includes(availableSampler.toLowerCase())) {
        return availableSampler;
      }
    }

    //Default to Euler a or first available sampler
    return availableSamplers.includes('Euler a') ? 'Euler a' : availableSamplers[0] || 'Euler a';
  };

  //Extract prompt data from AI message
  const extractPromptFromMessage = async (message: string) => {
    //Try to find JSON in the message first
    const jsonMatch = message.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

    if (jsonMatch && jsonMatch[1]) {
      try {
        //Parse the JSON directly from the message
        const extractedData = JSON.parse(jsonMatch[1]);
        createPromptFromData(extractedData);
        return;
      } catch (error) {
        console.error('Error parsing JSON from message:', error);
        //If direct parsing fails, continue to use AI extraction
      }
    }

    //If no valid JSON found or parsing failed, ask the AI to extract it
    if (message.includes('prompt')) {
      setIsExtractingPrompt(true);
      setExtractionError(null);

      try {
        //Create messages for AI extraction
        const extractionMessages = [
          { id: '1', role: 'system', content: EXTRACTION_PROMPT, timestamp: new Date().toISOString() },
          { id: '2', role: 'user', content: message, timestamp: new Date().toISOString() }
        ];

        //Get response from AI
        const response = await generateChatCompletion(
          DEFAULT_AI_API_KEY,
          settings.model,
          extractionMessages,
          0.1, //Lower temperature for more deterministic results
          1000 //Sufficient token limit for JSON output
        );

        if (!response) {
          throw new Error('Failed to extract prompt data from message.');
        }

        try {
          //Extract JSON from response
          let jsonData = response;
          const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            jsonData = jsonMatch[1];
          }

          //Parse the JSON
          const extractedData = JSON.parse(jsonData);
          createPromptFromData(extractedData);
        } catch (parseError) {
          console.error('Error parsing AI extraction response:', parseError);
          setExtractionError('Failed to parse the extracted prompt data.');
        }
      } catch (error) {
        console.error('Error during AI extraction:', error);
        setExtractionError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsExtractingPrompt(false);
      }
    }
  };

  //Create a prompt from extracted data
  const createPromptFromData = (data: any) => {
    if (!data || !data.prompt) return;

    //Find best matches for sampler and model
    const matchedSampler = findBestSamplerMatch(data.sampler || 'Euler a');
    const matchedModel = findBestModelMatch(data.model || '');

    //Create a name from the prompt
    let name = 'Generated Prompt';
    if (data.prompt) {
      const wordsToUse = data.prompt.split(/\s+/).slice(0, 4).join(' ');
      name = wordsToUse + (data.prompt.split(/\s+/).length > 4 ? '...' : '');
    }

    //Create the prompt object
    const newPrompt: Prompt = {
      id: generateUUID(),
      isOpen: true,
      name: name,
      text: data.prompt,
      negativePrompt: data.negativePrompt || '',
      seed: typeof data.seed === 'number' ? data.seed : -1,
      steps: typeof data.steps === 'number' ? data.steps : 20,
      sampler: matchedSampler,
      model: matchedModel,
      width: typeof data.width === 'number' ? data.width : 512,
      height: typeof data.height === 'number' ? data.height : 512,
      runCount: 1,
      tags: Array.isArray(data.tags) ? data.tags : [],
      loras: Array.isArray(data.loras) ? data.loras : [],
      currentRun: 0,
      status: 'idle',
    };

    //Set the generated prompt and show the form
    setGeneratedPrompt(newPrompt);
    setShowPromptForm(true);
  };

  //Save prompt to the prompt list
  const savePromptToList = async () => {
    if (!generatedPrompt) return;

    try {
      //Get existing prompts
      const existingPrompts = await promptsApi.getAllPrompts();

      //Add the prompt to the list
      const updatedPrompts = [...existingPrompts, generatedPrompt];
      const success = await promptsApi.saveAllPrompts(updatedPrompts);

      if (success) {
        alert("Prompt saved successfully!");
        setShowPromptForm(false);
        setGeneratedPrompt(null);
      } else {
        alert("Failed to save prompt.");
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
      alert("Failed to save prompt: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  //Extract prompt manually using button
  const handleExtractFromLastMessage = async () => {
    if (messages.length === 0 || isExtractingPrompt) return;

    //Get the last assistant message
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) return;

    const lastMessage = assistantMessages[assistantMessages.length - 1].content;
    await extractPromptFromMessage(lastMessage);
  };

  //Render individual message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    if (isSystem) return null; //Don't show system messages

    return (
      <div
        key={message.id}
        className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className="flex items-start max-w-[80%]">
          <div
            className={`rounded-full h-8 w-8 flex items-center justify-center mr-2 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
          >
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </div>

          <div className="flex flex-col">
            <div
              className={`rounded-lg p-4 ${isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border'
                }`}
            >
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1 ml-2">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Chat Card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-lg flex items-center">
              <BrainCog className="h-5 w-5 mr-2" />
              Chat with {settings.model}
            </CardTitle>
          </CardHeader>

          <div className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Message Area */}
            {messages.filter(m => m.role !== 'system').length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BrainCog className="mx-auto h-12 w-12 opacity-50 mb-2" />
                  <p>No messages yet. Start the conversation!</p>
                  <p className="text-sm mt-2 max-w-sm">
                    Ask me to create a Stable Diffusion prompt for you, or for tips on crafting effective prompts.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-1">
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}

            {/* Input Area */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for prompt ideas or help with Stable Diffusion..."
                  className="min-h-[70px] resize-none"
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isProcessing}
                  className="h-auto"
                >
                  {isProcessing ?
                    <RefreshCw className="h-4 w-4 animate-spin" /> :
                    <Send className="h-4 w-4" />
                  }
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 flex justify-between items-center">
                <div className="flex items-center text-xs text-muted-foreground">
                  <BrainCog className="h-3 w-3 mr-1" />
                  {isProcessing ? 'Thinking...' : `Model: ${settings.model}`}
                </div>

                <div className="flex gap-2">
                  {messages.filter(m => m.role === 'assistant').length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExtractFromLastMessage}
                      className="text-xs"
                      disabled={isExtractingPrompt}
                    >
                      <Wand2 className={`h-3 w-3 mr-1 ${isExtractingPrompt ? 'animate-spin' : ''}`} />
                      Extract Prompt
                    </Button>
                  )}

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
                    New Prompt
                  </Button>

                  {messages.filter(m => m.role !== 'system').length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to clear the chat?')) {
                          clearMessages();
                          //Reinitialize with system message
                          sendMessage(CHAT_SYSTEM_PROMPT, 'system');
                        }
                      }}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Chat
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Prompt Form Card - Only shown when a prompt is generated */}
        {showPromptForm && generatedPrompt ? (
          <Card className="overflow-auto max-h-[600px]">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <ListChecks className="h-4 w-4 mr-2" />
                  Generated Prompt
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPromptForm(false)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 pt-0">
              <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Prompt Generated</AlertTitle>
                <AlertDescription>
                  Review and customize this prompt before saving.
                </AlertDescription>
              </Alert>

              {extractionError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{extractionError}</AlertDescription>
                </Alert>
              )}

              <div className="border p-4 rounded-md overflow-auto">
                <PromptForm
                  prompt={generatedPrompt}
                  onPromptUpdate={setGeneratedPrompt}
                  availableSamplers={availableSamplers}
                  availableModels={availableModels}
                  availableLoras={availableLoras}
                />
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={savePromptToList}
                  disabled={isLoadingApiData}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Save to Prompt List
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-h-[600px]">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-lg flex items-center">
                <ListChecks className="h-4 w-4 mr-2" />
                Prompt Creation
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Image className="h-12 w-12 mb-4 opacity-30" />
                <p className="mb-2">No prompt generated yet</p>
                <p className="text-sm max-w-xs">
                  Ask the AI to create a prompt for you, then click "Extract Prompt" to edit and save it.
                </p>

                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    setInputMessage("Create a detailed Stable Diffusion prompt for a fantasy landscape with dragons, mountains, and a castle");
                    inputRef.current?.focus();
                  }}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Request Sample Prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}