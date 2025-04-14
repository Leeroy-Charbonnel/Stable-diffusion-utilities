// src/components/prompt/DraggablePromptList.tsx
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { PromptConfig } from '../../types/prompt';
import { usePrompts } from '../../context/PromptContext';
import { PromptItem } from './PromptItem';
import { PromptForm } from './PromptForm';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

export const DraggablePromptList: React.FC = () => {
  const { prompts, reorderPrompts, deletePrompt } = usePrompts();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptConfig | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  
  const handleEdit = (prompt: PromptConfig) => {
    setEditingPrompt(prompt);
    setIsAddDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingPrompt(null);
  };

  const handleClearAll = () => {
    //Delete all prompts
    prompts.forEach(prompt => deletePrompt(prompt.id));
    setClearAllDialogOpen(false);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    
    //If dropped outside the list or at the same position
    if (!destination || (destination.index === source.index)) {
      return;
    }
    
    //Reorder the prompts
    reorderPrompts(source.index, destination.index);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Prompt List ({prompts.length})</h2>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={() => setClearAllDialogOpen(true)}
            disabled={prompts.length === 0}
          >
            Clear All
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus size={16} className="mr-1" /> Add Prompt
          </Button>
        </div>
      </div>

      {prompts.length === 0 ? (
        <div className="text-center p-8 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No prompts added yet. Add your first prompt to get started.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="prompt-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {prompts.map((prompt, index) => (
                  <Draggable key={prompt.id} draggableId={prompt.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <PromptItem 
                          prompt={prompt}
                          onEdit={handleEdit}
                          isDragging={snapshot.isDragging}
                          dragHandleProps={provided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Add/Edit Prompt Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</DialogTitle>
          </DialogHeader>
          <PromptForm 
            initialPrompt={editingPrompt || undefined} 
            onSubmit={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm Clear All Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Prompts</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all prompts in your list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
