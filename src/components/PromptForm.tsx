// src/components/PromptForm.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { XIcon, Trash } from 'lucide-react';
import { Prompt, LoraConfig } from '@/types';
import { copyToAppClipboard, getFromAppClipboard, handleContextMenu } from '@/lib/clipboard';

type PromptFormProps = {
  prompt?: Prompt;
  onSubmit: (prompt: Prompt) => void;
  onCancel: () => void;
  availableSamplers?: string[];
  availableModels?: string[];
  availableLoras?: any[];
  currentModel?: string;
};

export function PromptForm({ 
  prompt, 
  onSubmit, 
  onCancel, 
  availableSamplers = [],
  availableModels = [],
  availableLoras = [],
  currentModel = ''
}: PromptFormProps) {
  const [formData, setFormData] = useState<Omit<Prompt, 'id'>>({
    name: prompt?.name || 'New Prompt',
    text: prompt?.text || '',
    negativePrompt: prompt?.negativePrompt || '',
    seed: prompt?.seed,
    steps: prompt?.steps || 20,
    sampler: prompt?.sampler || 'Euler a',
    model: prompt?.model || currentModel,
    width: prompt?.width || 512,
    height: prompt?.height || 512,
    runCount: prompt?.runCount || 1,
    tags: prompt?.tags || [],
    loras: prompt?.loras || [],
  });
  
  const [tagInput, setTagInput] = useState('');
  const [loraWeight, setLoraWeight] = useState(1.0);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    //Convert numeric fields
    if (['seed', 'steps', 'width', 'height', 'runCount'].includes(name)) {
      const numValue = value === '' ? undefined : parseInt(value, 10);
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  // LoRA handling - automatically add on selection
  const handleLoraSelect = (loraName: string) => {
    if (loraName && !formData.loras?.some(l => l.name === loraName)) {
      setFormData(prev => ({
        ...prev,
        loras: [...(prev.loras || []), { name: loraName, weight: loraWeight }]
      }));
      // Reset weight to default after adding
      setLoraWeight(1.0);
    }
  };

  const removeLora = (loraName: string) => {
    setFormData(prev => ({
      ...prev,
      loras: prev.loras?.filter(l => l.name !== loraName) || []
    }));
  };

  const updateLoraWeight = (loraName: string, weight: number) => {
    setFormData(prev => ({
      ...prev,
      loras: prev.loras?.map(l => 
        l.name === loraName ? { ...l, weight } : l
      ) || []
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: prompt?.id || crypto.randomUUID(),
      ...formData,
    });
  };

  // Log available LoRAs when component mounts or updates
  React.useEffect(() => {
    console.log("Available LoRAs in PromptForm:", availableLoras);
  }, [availableLoras]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Prompt Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Enter a name for this prompt"
        />
      </div>
      
      <div>
        <Label htmlFor="text">Prompt</Label>
        <div 
          onContextMenu={(e) => 
            handleContextMenu(e, 'prompt', formData.text, {
              copy: () => copyToAppClipboard('prompt', formData.text),
              paste: () => {
                const clipboard = getFromAppClipboard<string>('prompt');
                if (clipboard) {
                  setFormData(prev => ({...prev, text: clipboard}));
                }
              }
            })
          }
          className="relative"
        >
          <Textarea
            id="text"
            name="text"
            value={formData.text}
            onChange={handleChange}
            required
            placeholder="Enter prompt text... (right-click to copy/paste)"
            className="min-h-24"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="negativePrompt">Negative Prompt</Label>
        <div
          onContextMenu={(e) => 
            handleContextMenu(e, 'negativePrompt', formData.negativePrompt, {
              copy: () => copyToAppClipboard('negativePrompt', formData.negativePrompt),
              paste: () => {
                const clipboard = getFromAppClipboard<string>('negativePrompt');
                if (clipboard) {
                  setFormData(prev => ({...prev, negativePrompt: clipboard}));
                }
              }
            })
          }
          className="relative"
        >
          <Textarea
            id="negativePrompt"
            name="negativePrompt"
            value={formData.negativePrompt}
            onChange={handleChange}
            placeholder="Enter negative prompt text... (right-click to copy/paste)"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="seed">Seed</Label>
          <Input
            id="seed"
            name="seed"
            type="number"
            value={formData.seed !== undefined ? formData.seed : ''}
            onChange={handleChange}
            placeholder="Random"
          />
        </div>
        <div>
          <Label htmlFor="steps">Steps</Label>
          <Input
            id="steps"
            name="steps"
            type="number"
            value={formData.steps}
            onChange={handleChange}
            required
            min={1}
            max={150}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="model">Model</Label>
        {availableModels.length > 0 ? (
          <Select
            value={formData.model || ''}
            onValueChange={(value) => handleSelectChange('model', value)}
          >
            <SelectTrigger id="model">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="model"
            name="model"
            value={formData.model || ''}
            onChange={handleChange}
            placeholder="No models available"
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="sampler">Sampler</Label>
          {availableSamplers.length > 0 ? (
            <Select
              value={formData.sampler}
              onValueChange={(value) => handleSelectChange('sampler', value)}
            >
              <SelectTrigger id="sampler">
                <SelectValue placeholder="Select a sampler" />
              </SelectTrigger>
              <SelectContent>
                {availableSamplers.map((sampler) => (
                  <SelectItem key={sampler} value={sampler}>
                    {sampler}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="sampler"
              name="sampler"
              value={formData.sampler}
              onChange={handleChange}
              required
            />
          )}
        </div>
        <div>
          <Label htmlFor="width">Width</Label>
          <Input
            id="width"
            name="width"
            type="number"
            value={formData.width}
            onChange={handleChange}
            required
            step={8}
            min={64}
            max={2048}
          />
        </div>
        <div>
          <Label htmlFor="height">Height</Label>
          <Input
            id="height"
            name="height"
            type="number"
            value={formData.height}
            onChange={handleChange}
            required
            step={8}
            min={64}
            max={2048}
          />
        </div>
      </div>

      {/* LoRA Section - Simplified */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>LoRAs</Label>
        </div>
        
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <Select
              onValueChange={handleLoraSelect}
              value="">
              <SelectTrigger>
                <SelectValue placeholder="Add a LoRA..." />
              </SelectTrigger>
              <SelectContent>
                {availableLoras.map((lora) => (
                  <SelectItem key={lora.name} value={lora.name}>
                    {lora.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Input
              type="number"
              min={0}
              max={2}
              step={0.05}
              value={loraWeight}
              onChange={(e) => setLoraWeight(parseFloat(e.target.value))}
              title="Default weight for new LoRAs"
            />
          </div>
        </div>
        
        {formData.loras && formData.loras.length > 0 ? (
          <div className="space-y-2">
            {formData.loras.map((lora) => (
              <div key={lora.name} className="flex items-center gap-2 p-2 border rounded-md">
                <div className="flex-1 text-sm font-medium">{lora.name}</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Weight: {lora.weight.toFixed(2)}</span>
                  <Input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={lora.weight}
                    onChange={(e) => updateLoraWeight(lora.name, parseFloat(e.target.value))}
                    className="w-24 h-2"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLora(lora.name)}
                    className="h-6 w-6"
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No LoRAs added</div>
        )}
      </div>

      <div>
        <Label htmlFor="runCount">Run Count</Label>
        <Input
          id="runCount"
          name="runCount"
          type="number"
          value={formData.runCount}
          onChange={handleChange}
          required
          min={1}
          max={100}
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <div className="flex gap-2 mb-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags (press Enter to add)"
          />
          <Button
            type="button"
            onClick={() => addTag(tagInput.trim())}
            disabled={!tagInput.trim()}
          >
            Add
          </Button>
        </div>
        <div 
          className="flex flex-wrap gap-2 mt-2"
          onContextMenu={(e) => 
            handleContextMenu(e, 'tags', formData.tags, {
              copy: () => copyToAppClipboard('tags', formData.tags),
              paste: () => {
                const clipboard = getFromAppClipboard<string[]>('tags');
                if (clipboard) {
                  // Merge tags without duplicates
                  const mergedTags = [...new Set([...formData.tags, ...clipboard])];
                  setFormData(prev => ({...prev, tags: mergedTags}));
                }
              }
            })
          }
        >
          {formData.tags.length > 0 ? (
            formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <XIcon
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeTag(tag)}
                />
              </Badge>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">(Right-click to copy/paste tags)</div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {prompt ? 'Update Prompt' : 'Add Prompt'}
        </Button>
      </div>
    </form>
  );
}