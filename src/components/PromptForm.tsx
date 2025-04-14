import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Prompt } from '../types';

type PromptFormProps = {
  prompt?: Prompt;
  onSubmit: (prompt: Prompt) => void;
  onCancel: () => void;
};

export function PromptForm({ prompt, onSubmit, onCancel }: PromptFormProps) {
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
          <Input
            id="sampler"
            name="sampler"
            value={formData.sampler}
            onChange={handleChange}
            required
          />
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