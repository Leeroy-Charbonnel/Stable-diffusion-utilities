// src/components/PromptForm.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { XIcon } from 'lucide-react';
import { Prompt } from '@/types';

type PromptFormProps = {
  prompt?: Prompt;
  onSubmit: (prompt: Prompt) => void;
  onCancel: () => void;
  availableSamplers?: string[];
};

export function PromptForm({ prompt, onSubmit, onCancel, availableSamplers = [] }: PromptFormProps) {
  const [formData, setFormData] = useState<Omit<Prompt, 'id'>>({
    text: prompt?.text || '',
    negativePrompt: prompt?.negativePrompt || '',
    seed: prompt?.seed,
    steps: prompt?.steps || 20,
    sampler: prompt?.sampler || 'Euler a',
    width: prompt?.width || 512,
    height: prompt?.height || 512,
    runCount: prompt?.runCount || 1,
    tags: prompt?.tags || [],
  });
  
  const [tagInput, setTagInput] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: prompt?.id || crypto.randomUUID(),
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="text">Prompt</Label>
        <Textarea
          id="text"
          name="text"
          value={formData.text}
          onChange={handleChange}
          required
          placeholder="Enter prompt text..."
          className="min-h-24"
        />
      </div>

      <div>
        <Label htmlFor="negativePrompt">Negative Prompt</Label>
        <Textarea
          id="negativePrompt"
          name="negativePrompt"
          value={formData.negativePrompt}
          onChange={handleChange}
          placeholder="Enter negative prompt text... (optional)"
        />
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
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <XIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
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