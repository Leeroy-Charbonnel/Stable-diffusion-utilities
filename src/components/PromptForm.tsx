// src/components/PromptForm.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  // Track if this is an edit (not a new prompt)
  const isEdit = !!prompt?.id;

  // Ref to track changes to prevent infinite loops
  const isUpdating = useRef(false);

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

  // This function will be called when a form field changes
  const handleFormChange = (updatedData: Partial<Omit<Prompt, 'id'>>) => {
    const newFormData = { ...formData, ...updatedData };
    setFormData(newFormData);

    // Only submit changes for existing prompts, not for new ones
    if (isEdit && !isUpdating.current) {
      isUpdating.current = true;

      // Use setTimeout to avoid state update during render
      setTimeout(() => {
        onSubmit({
          id: prompt.id,
          ...newFormData,
        });
        isUpdating.current = false;
      }, 0);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    //Convert numeric fields
    if (['seed', 'steps', 'width', 'height', 'runCount'].includes(name)) {
      const numValue = value === '' ? undefined : parseInt(value, 10);
      handleFormChange({ [name]: numValue });
    } else {
      handleFormChange({ [name]: value });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    handleFormChange({ [name]: value });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      handleFormChange({
        tags: [...formData.tags, tag],
      });
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    handleFormChange({
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  // LoRA handling - automatically add on selection
  const handleLoraSelect = (loraName: string) => {
    if (loraName && !formData.loras?.some(l => l.name === loraName)) {
      handleFormChange({
        loras: [...(formData.loras || []), { name: loraName, weight: 1.0 }]
      });
    }
  };

  const removeLora = (loraName: string) => {
    handleFormChange({
      loras: formData.loras?.filter(l => l.name !== loraName) || []
    });
  };

  const updateLoraWeight = (loraName: string, weight: number) => {
    handleFormChange({
      loras: formData.loras?.map(l =>
        l.name === loraName ? { ...l, weight } : l
      ) || []
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: prompt?.id || crypto.randomUUID(),
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      <div>
        <Label htmlFor="text" className="text-xs">Prompt</Label>
        <div
          onContextMenu={(e) =>
            handleContextMenu(e, 'prompt', formData.text, {
              copy: () => copyToAppClipboard('prompt', formData.text),
              paste: () => {
                const clipboard = getFromAppClipboard<string>('prompt');
                if (clipboard) {
                  handleFormChange({ text: clipboard });
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
            placeholder="Enter prompt text..."
            className="min-h-20"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="negativePrompt" className="text-xs">Negative Prompt</Label>
        <div
          onContextMenu={(e) =>
            handleContextMenu(e, 'negativePrompt', formData.negativePrompt, {
              copy: () => copyToAppClipboard('negativePrompt', formData.negativePrompt),
              paste: () => {
                const clipboard = getFromAppClipboard<string>('negativePrompt');
                if (clipboard) {
                  handleFormChange({ negativePrompt: clipboard });
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
            placeholder="Enter negative prompt text..."
            className="min-h-16"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label htmlFor="seed" className="text-xs">Seed</Label>
          <Input
            id="seed"
            name="seed"
            type="number"
            value={formData.seed !== undefined ? formData.seed : ''}
            onChange={handleChange}
            placeholder="Random"
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="steps" className="text-xs">Steps</Label>
          <Input
            id="steps"
            name="steps"
            type="number"
            value={formData.steps}
            onChange={handleChange}
            required
            min={1}
            max={150}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="width" className="text-xs">Width</Label>
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
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="height" className="text-xs">Height</Label>
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
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="sampler" className="text-xs">Sampler</Label>
          {availableSamplers.length > 0 ? (
            <Select
              value={formData.sampler}
              onValueChange={(value) => handleSelectChange('sampler', value)}
            >
              <SelectTrigger id="sampler" className="h-8">
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
              className="h-8"
            />
          )}
        </div>
        <div>
          <Label htmlFor="model" className="text-xs">Model</Label>
          {availableModels.length > 0 ? (
            <Select
              value={formData.model || ''}
              onValueChange={(value) => handleSelectChange('model', value)}
            >
              <SelectTrigger id="model" className="h-8">
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
              className="h-8"
            />
          )}
        </div>
        <div>
          <Label htmlFor="runCount" className="text-xs">Run Count</Label>
          <Input
            id="runCount"
            name="runCount"
            type="number"
            value={formData.runCount}
            onChange={handleChange}
            required
            min={1}
            max={100}
            className="h-8"
          />
        </div>
      </div>

      {/* LoRA Section - Simplified */}
      <div>
        <div className="flex items-center mb-1">
          <Label className="text-xs">LoRAs</Label>
        </div>

        <div className="mb-2">
          <Select
            onValueChange={handleLoraSelect}
            value="">
            <SelectTrigger className="h-8">
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

        {formData.loras && formData.loras.length > 0 ? (
          <div className="space-y-1">
            {formData.loras.map((lora) => (
              <div key={lora.name} className="flex items-center gap-2 p-1 border rounded-md">
                <div className="flex-1 text-xs font-medium">{lora.name}</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-10">{lora.weight.toFixed(2)}</span>
                  <Input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={lora.weight}
                    onChange={(e) => updateLoraWeight(lora.name, parseFloat(e.target.value))}
                    className="w-20 h-2"
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
        <Label htmlFor="tags" className="text-xs">Tags</Label>
        <div className="flex justify-between gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags (press Enter to add)"
            className="h-8 flex-1"
          />
          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={onCancel} size="sm" className="h-8">
              Cancel
            </Button>
            {/* Only show the Add Prompt button for new prompts, not for edits */}
            {!isEdit && (
              <Button type="submit" size="sm" className="h-8">
                Add Prompt
              </Button>
            )}
          </div>
        </div>
        <div
          className="flex flex-wrap gap-1 mt-1"
          onContextMenu={(e) =>
            handleContextMenu(e, 'tags', formData.tags, {
              copy: () => copyToAppClipboard('tags', formData.tags),
              paste: () => {
                const clipboard = getFromAppClipboard<string[]>('tags');
                if (clipboard) {
                  // Merge tags without duplicates
                  const mergedTags = [...new Set([...formData.tags, ...clipboard])];
                  handleFormChange({ tags: mergedTags });
                }
              }
            })
          }
        >
          {formData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs py-1">
              {tag}
              <XIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      </div>
    </form>
  );
}