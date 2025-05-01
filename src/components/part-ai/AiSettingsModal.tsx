import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAi } from '@/contexts/contextAI';
import { RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';

interface AiSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiSettingsModal({ open, onOpenChange }: AiSettingsModalProps) {
  const {
    settings,
    availableModels,
    isLoadingModels,
    setModel,
    setTemperature,
    setMaxTokens,
  } = useAi();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>

            <DropdownMenu>
              <DropdownMenuTrigger className='border p-2'>{settings.model}</DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableModels.map((modelName) => (
                  <DropdownMenuItem key={modelName} onClick={() => setModel(modelName)}> {modelName}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {isLoadingModels && (
              <p className="text-xs text-muted-foreground flex items-center">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Loading available models...
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
      </DialogContent>
    </Dialog >
  );
}