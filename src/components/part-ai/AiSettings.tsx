import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Settings, RefreshCw } from 'lucide-react';
import { useAi } from '@/contexts/AiContext';
import { AiModel } from '@/types';

export function AiSettings() {
  const {
    settings,
    setApiKey,
    setModel,
    setTemperature,
    setMaxTokens,
  } = useAi();

  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [availableModels, setAvailableModels] = useState<AiModel[]>(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();

      // Filter and map to our AiModel type
      const openAiModels = data.data
        .filter((model: any) => model.id.startsWith('gpt-'))
        .map((model: any) => model.id as AiModel)
        .filter((modelId: AiModel) =>
          ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'].includes(modelId)
        );

      // Ensure we have at least the default models
      const models = openAiModels.length > 0
        ? openAiModels
        : ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];

      setAvailableModels(models);

      // If current model is not in the list, set to the first available model
      if (!models.includes(settings.model)) {
        setModel(models[0]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Fallback to default models if fetch fails
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
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                'Refresh Models'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your API key is stored locally and never sent to our servers.
          </p>
        </div>

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