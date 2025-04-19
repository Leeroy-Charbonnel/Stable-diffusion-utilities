import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { useAi } from '@/contexts/AiContext';
import { AiModel } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AiSettings() {
  const {
    settings,
    setApiKey,
    setModel,
    setTemperature,
    setMaxTokens,
  } = useAi();

  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [availableModels, setAvailableModels] = useState<AiModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.apiKey) {
      fetchAvailableModels();
    } else {
      //Set default models when no API key is available
      setAvailableModels(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
    }
  }, [settings.apiKey]);

  const fetchAvailableModels = async () => {
    if (!settings.apiKey) return;

    setIsLoadingModels(true);
    setError(null);

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API returned ${response.status}`);
      }

      const data = await response.json();

      //Filter to get only GPT chat models and sort by newest/most capable first
      const chatModels = data.data
        .filter((model: any) =>
          model.id.includes('gpt') &&
          (model.id.includes('turbo') || model.id.includes('gpt-4'))
        )
        .map((model: any) => model.id as AiModel)
        .sort((a: string, b: string) => {
          //Sort gpt-4 models first, then by version number
          const aIsGpt4 = a.includes('gpt-4');
          const bIsGpt4 = b.includes('gpt-4');

          if (aIsGpt4 && !bIsGpt4) return -1;
          if (!aIsGpt4 && bIsGpt4) return 1;

          //Within same model family, sort by version (newer first)
          return b.localeCompare(a);
        });

      if (chatModels.length > 0) {
        setAvailableModels(chatModels);

        //If current model is not in available models, select the first one
        if (!chatModels.includes(settings.model)) {
          setModel(chatModels[0]);
        }
      } else {
        //Fallback to defaults if no chat models found
        setAvailableModels(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
        setError('No compatible chat models found in your account');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch models');
      setAvailableModels(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          AI Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="apiKey">OpenAI API Key</Label>
          <div className="flex gap-2">
            <Input
              id="apiKey"
              type={isApiKeyVisible ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
            <Button
              variant="outline"
              onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
            >
              {isApiKeyVisible ? 'Hide' : 'Show'}
            </Button>
            <Button
              variant="outline"
              onClick={fetchAvailableModels}
              disabled={!settings.apiKey || isLoadingModels}
            >
              {isLoadingModels ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Refresh Models'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your API key is stored locally and never sent to our servers.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={settings.model}
              onValueChange={(value) => setModel(value as AiModel)}
            >
              <SelectTrigger id="model" disabled={isLoadingModels}>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((modelName) => (
                  <SelectItem key={modelName} value={modelName}>
                    {modelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingModels && (
              <p className="text-xs text-muted-foreground flex items-center">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Fetching available models...
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="temperature">Temperature: {settings.temperature.toFixed(1)}</Label>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.1}
              value={[settings.temperature]}
              onValueChange={(values) => setTemperature(values[0])}
            />
            <p className="text-xs text-muted-foreground">
              Lower values make responses more deterministic, higher values make them more creative.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="maxTokens">Max Tokens: {settings.maxTokens}</Label>
            </div>
            <Slider
              id="maxTokens"
              min={100}
              max={4000}
              step={100}
              value={[settings.maxTokens]}
              onValueChange={(values) => setMaxTokens(values[0])}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of tokens the AI can generate in a response.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}