import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, ChevronsUpDown, Check } from 'lucide-react';
import { useState } from 'react';
import { LabelItem, EmbeddingEditorConfig } from '@/types';
import { getModelLabel } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { RANDOM_LORAS_MAX_WEIGHT, RANDOM_LORAS_MIN_WEIGHT } from '@/lib/constants';

interface EmbeddingsEditorProps {
  embeddings: EmbeddingEditorConfig[];
  embeddingsRandom: boolean;
  availableEmbeddings: LabelItem[];
  onEmbeddingsChange: (embeddings: EmbeddingEditorConfig[]) => void;
  onEmbeddingsRandomChange: (random: boolean) => void;
}

export function EmbeddingsEditor({
  embeddings,
  embeddingsRandom,
  availableEmbeddings,
  onEmbeddingsChange,
  onEmbeddingsRandomChange
}: EmbeddingsEditorProps) {
  const [embeddingOpen, setEmbeddingOpen] = useState(false);

  const addEmbedding = (embedding: { name: string; weight: number; random: boolean }) => {
    // Don't add if embedding already exists
    if (embeddings.some(e => e.name === embedding.name)) return;

    const newEmbeddings = [...embeddings, embedding];
    onEmbeddingsChange(newEmbeddings);
  };

  const removeEmbedding = (index: number) => {
    const newEmbeddings = [...embeddings];
    newEmbeddings.splice(index, 1);
    onEmbeddingsChange(newEmbeddings);
  };

  const updateEmbeddingWeight = (index: number, weight: number) => {
    const newEmbeddings = [...embeddings];
    newEmbeddings[index] = { ...newEmbeddings[index], weight };
    onEmbeddingsChange(newEmbeddings);
  };

  const updateEmbeddingRandom = (index: number, random: boolean) => {
    const newEmbeddings = [...embeddings];
    newEmbeddings[index] = { ...newEmbeddings[index], random };
    onEmbeddingsChange(newEmbeddings);
  };
  
  if (!embeddings) return <div></div>

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Embeddings</h4>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Random Selection</span>
          <Switch
            checked={embeddingsRandom}
            onCheckedChange={onEmbeddingsRandomChange}
            disabled={embeddings.length === 0}
          />
        </div>
      </div>

      <div className="space-y-2">
        {embeddings.map((embedding, index) => (
          <div key={index} className="flex items-center space-x-2 p-2 border rounded-md">
            <div className="flex-1 overflow-hidden">
              <div className="font-medium truncate">{getModelLabel(availableEmbeddings, embedding.name)}</div>
              <div className="flex items-center space-x-2">
                <Slider
                  value={[embedding.weight]}
                  min={RANDOM_LORAS_MIN_WEIGHT}
                  max={RANDOM_LORAS_MAX_WEIGHT}
                  step={0.05}
                  onValueChange={(value) => updateEmbeddingWeight(index, value[0])}
                  disabled={embedding.random}
                  className="flex-1"
                />
                <span className="text-xs w-8 text-right">{embedding.weight.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center">
              <Switch
                checked={embedding.random}
                onCheckedChange={(checked) => updateEmbeddingRandom(index, checked)}
                disabled={embeddingsRandom}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeEmbedding(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {embeddings.length === 0 && (
          <div className="text-center p-2 text-sm text-muted-foreground border border-dashed rounded-md">
            No embeddings added yet
          </div>
        )}
      </div>

      <Separator />

      <Popover open={embeddingOpen} onOpenChange={setEmbeddingOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={embeddingOpen}
            className="w-full justify-between"
            disabled={availableEmbeddings.length === 0}
          >
            <span>Add Embedding</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command>
            <CommandInput placeholder="Search embeddings..." />
            <CommandEmpty>No embedding found.</CommandEmpty>
            <CommandGroup>
              {availableEmbeddings.map((embedding) => (
                <CommandItem
                  key={embedding.name}
                  value={embedding.name}
                  onSelect={() => {
                    addEmbedding({ name: embedding.name, weight: 1.0, random: false });
                    setEmbeddingOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${embeddings.some(e => e.name === embedding.name)
                        ? 'opacity-100'
                        : 'opacity-0'
                      }`}
                  />
                  {embedding.label || embedding.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}