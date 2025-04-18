import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Image as ImageIcon,
  InfoIcon,
  RefreshCw,
  Folder,
  FolderOpen,
  Trash2,
  Sliders
} from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { GeneratedImage, Prompt } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Import our new component files
import { FilterPanel } from './FilterPanel';
import { ImageCard } from './ImageCard';
import { ImageDetailsDialog } from './ImageDetailsDialog';

export function ImageViewer() {
  const {
    generatedImages,
    stableDiffusionApi,
    fileSystemApi,
    promptsApi,
    deleteImage,
    refreshImages,
    updateImageTags,
    updateImageMetadata
  } = useApi();

  const [filteredImages, setFilteredImages] = useState<GeneratedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedLoras, setSelectedLoras] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [promptCopied, setPromptCopied] = useState(false);
  const [createPromptDialogOpen, setCreatePromptDialogOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [imageDataCache, setImageDataCache] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<string[]>(['default']);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('default');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  //Ref for the context menu click handler
  const contextMenuRef = useRef<HTMLDivElement>(null);

  //Load image data for a specific image
  const loadImageData = useCallback(async (imageId: string) => {
    if (imageDataCache[imageId]) {
      return imageDataCache[imageId];
    }

    try {
      //We need the full image data which includes the base64 content
      const response = await fetch(`/api/images/${imageId}`);

      if (!response.ok) {
        console.error(`Failed to load image ${imageId}: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.success && data.data) {
        // The server returns a base64 string - we need to prepend the data URL prefix
        const imageUrl = `data:image/png;base64,${data.data}`;
        setImageDataCache(prev => ({ ...prev, [imageId]: imageUrl }));
        return imageUrl;
      }
    } catch (error) {
      console.error(`Error loading image ${imageId}:`, error);
    }

    return null;
  }, [imageDataCache]);

  //Refresh images
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshImages();
      //Clear image data cache
      setImageDataCache({});
      //Also, scan for folders
      scanForFolders();
    } catch (error) {
      console.error('Error refreshing images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  //Scan for available folders
  const scanForFolders = useCallback(() => {
    //Extract folders from image paths
    const folders = new Set<string>(['default']);
    generatedImages.forEach(img => {
      const folder = img.path.includes('/') ? img.path.split('/')[0] : 'default';
      folders.add(folder);
    });
    setAvailableFolders(Array.from(folders).sort());
  }, [generatedImages]);

  //Open output folder
  const openOutputFolder = async () => {
    try {
      const success = await fileSystemApi.openOutputFolder();
      if (!success) {
        console.error('Failed to open folder');
      }
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  //Handle moving images to a folder
  const moveImagesToFolder = async (imageIds: string[], folder: string) => {
    setIsLoading(true);
    try {
      //Process each image
      for (const imageId of imageIds) {
        const image = generatedImages.find(img => img.id === imageId);
        if (image) {
          const currentPath = image.path;
          const filename = currentPath.includes('/') ? currentPath.split('/').pop()! : currentPath;
          const newPath = folder === 'default' ? filename : `${folder}/${filename}`;

          //Update image metadata with new path
          await updateImageMetadata(imageId, { path: newPath });
        }
      }

      //Refresh after moving
      await refreshImages();
      setSelectedImages([]);
    } catch (error) {
      console.error('Error moving images:', error);
    } finally {
      setIsLoading(false);
      setFolderDialogOpen(false);
    }
  };

  //Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return;

    setIsLoading(true);
    try {
      //Delete each selected image
      for (const imageId of selectedImages) {
        await deleteImage(imageId);
      }

      //Clear selection
      setSelectedImages([]);
    } catch (error) {
      console.error('Error deleting images:', error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  //Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  //Select all images
  const selectAllImages = () => {
    if (selectedImages.length === filteredImages.length) {
      //If all are selected, deselect all
      setSelectedImages([]);
    } else {
      //Otherwise, select all filtered images
      setSelectedImages(filteredImages.map(img => img.id));
    }
  };

  //Get image folder
  const getImageFolder = (image: GeneratedImage) => {
    return image.path.includes('/')
      ? image.path.split('/')[0]
      : 'default';
  };

  //Extract all unique tags, models, and loras from images
  useEffect(() => {
    const tags = new Set<string>();
    const models = new Set<string>();
    const loras = new Set<string>();

    generatedImages.forEach(img => {
      //Extract tags
      img.tags?.forEach(tag => tags.add(tag));

      //Extract models
      if (img.model) {
        models.add(img.model);
      }

      //For loras, we would need to extract from the prompt or metadata
      //This is a placeholder for LoRA extraction
    });

    setAvailableTags(Array.from(tags).sort());
    setAvailableModels(Array.from(models).sort());
    setAvailableLoras(Array.from(loras).sort());

    //Also scan for folders
    scanForFolders();
  }, [generatedImages, scanForFolders]);

  //Filter images based on search query, selected tags, models, and loras
  useEffect(() => {
    let filtered = [...generatedImages];

    //Search by prompt or tags
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.prompt.toLowerCase().includes(query) ||
          img.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    //Filter by selected tags (all selected tags must be present)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((img) =>
        selectedTags.every((tag) => img.tags.includes(tag))
      );
    }

    //Filter by selected models
    if (selectedModels.length > 0) {
      filtered = filtered.filter((img) =>
        img.model && selectedModels.includes(img.model)
      );
    }

    //Filter by selected loras (placeholder - implement based on your LoRA storage)
    if (selectedLoras.length > 0) {
      // Implement LoRA filtering logic here based on how LoRAs are stored
    }

    //Sort by creation date, newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredImages(filtered);
  }, [generatedImages, searchQuery, selectedTags, selectedModels, selectedLoras]);

  //Handle clicks outside context menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  //Preload images when filtered images change
  useEffect(() => {
    //Preload the first few images
    const preloadCount = Math.min(9, filteredImages.length);
    const preloadImages = async () => {
      for (let i = 0; i < preloadCount; i++) {
        await loadImageData(filteredImages[i].id);
      }
    };

    preloadImages();
  }, [filteredImages, loadImageData]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleModelFilter = (model: string) => {
    setSelectedModels((prev) =>
      prev.includes(model)
        ? prev.filter((m) => m !== model)
        : [...prev, model]
    );
  };

  const toggleLoraFilter = (lora: string) => {
    setSelectedLoras((prev) =>
      prev.includes(lora)
        ? prev.filter((l) => l !== lora)
        : [...prev, lora]
    );
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedModels([]);
    setSelectedLoras([]);
  };

  const handleDeleteImage = async () => {
    if (!selectedImage) return;

    try {
      setIsLoading(true);
      const success = await deleteImage(selectedImage.id);

      if (success) {
        //Remove from cache
        const newCache = { ...imageDataCache };
        delete newCache[selectedImage.id];
        setImageDataCache(newCache);
      } else {
        console.error(`Failed to delete image ${selectedImage.id}`);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedImage(null);
      setIsLoading(false);
    }
  };

  const handleAddTag = async (tag: string) => {
    if (!tag.trim() || !selectedImage) return;

    try {
      const newTags = [...selectedImage.tags];
      if (!newTags.includes(tag.trim())) {
        newTags.push(tag.trim());
        await updateImageTags(selectedImage.id, newTags);
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedImage) return;

    try {
      const newTags = selectedImage.tags.filter(t => t !== tag);
      await updateImageTags(selectedImage.id, newTags);
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const handleDownload = () => {
    if (!selectedImage) return;

    const imageData = imageDataCache[selectedImage.id];
    if (imageData) {
      //Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = imageData;
      link.download = selectedImage.filename;
      link.click();
    }
  };

  const handleCreatePrompt = async () => {
    if (!selectedImage || !newPromptName.trim()) return;

    try {
      setIsLoading(true);

      //Get existing prompts
      const existingPrompts = await promptsApi.getAllPrompts();

      //Create a new prompt based on the selected image
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        name: newPromptName.trim(),
        text: selectedImage.prompt,
        negativePrompt: selectedImage.negativePrompt,
        seed: selectedImage.seed,
        steps: selectedImage.steps,
        sampler: selectedImage.sampler,
        width: selectedImage.width,
        height: selectedImage.height,
        runCount: 1,
        tags: [...selectedImage.tags],
        isOpen: true,
        currentRun: 0,
        stauts: 'idle',
      };

      //Add new prompt
      existingPrompts.push(newPrompt);

      //Save to server
      const success = await promptsApi.saveAllPrompts(existingPrompts);

      if (!success) {
        console.error('Failed to save prompt');
        return;
      }

      //Close dialogs
      setCreatePromptDialogOpen(false);
      setDetailDialogOpen(false);
      setSelectedImage(null);
      setNewPromptName('');
    } catch (error) {
      console.error('Error creating prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  //Updated handleReRunImage function to use the file-based API
  const handleReRunImage = async (image: GeneratedImage) => {
    try {
      setIsLoading(true);

      //Get existing prompts
      const existingPrompts = await promptsApi.getAllPrompts();

      //Create a new prompt based on the image
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        name: `Rerun: ${image.prompt.substring(0, 20)}...`,
        text: image.prompt,
        negativePrompt: image.negativePrompt,
        seed: image.seed,
        steps: image.steps,
        sampler: image.sampler,
        width: image.width,
        height: image.height,
        runCount: 1,
        tags: [...image.tags],
        isOpen: true,
        currentRun: 0,
        stauts: 'idle',
      };

      //Add new prompt
      existingPrompts.push(newPrompt);

      //Save to server
      const success = await promptsApi.saveAllPrompts(existingPrompts);

      if (!success) {
        console.error('Failed to save prompt');
        return;
      }

      //Navigate to prompts tab
      const promptsButton = document.querySelector('button[data-tab="prompts"]');
      if (promptsButton) {
        (promptsButton as HTMLButtonElement).click();
      }
    } catch (error) {
      console.error('Error re-running image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageClick = async (image: GeneratedImage) => {
    //Load image data if not already loaded
    if (!imageDataCache[image.id]) {
      await loadImageData(image.id);
    }

    setSelectedImage(image);
    setDetailDialogOpen(true);
  };

  const handleContextMenu = (e: React.MouseEvent, imageId: string) => {
    e.preventDefault();
    //Add to selection if not already selected
    if (!selectedImages.includes(imageId)) {
      setSelectedImages(prev => [...prev, imageId]);
    }

    //Set context menu position
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleOpenCreatePromptDialog = () => {
    if (selectedImage) {
      setNewPromptName(selectedImage.prompt.substring(0, 30) + '...' || 'New Prompt');
      setCreatePromptDialogOpen(true);
    }
  };

  //If there are no images
  if (generatedImages.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Image Gallery</h2>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={openOutputFolder} variant="outline">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open Folder
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Images Found</h3>
            <p className="text-muted-foreground">
              Generate some images using the Prompts tab to see them here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Main Content */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Image Gallery</h2>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="md:hidden"
            >
              <Sliders className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={openOutputFolder} variant="outline">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open Folder
            </Button>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search images..."
                className="pl-8 w-64"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <Checkbox
              id="select-all"
              checked={selectedImages.length > 0 && selectedImages.length === filteredImages.length}
              className="mr-2"
              onClick={selectAllImages}
            />
            <label htmlFor="select-all" className="text-sm cursor-pointer">
              {selectedImages.length === 0
                ? "Select All"
                : selectedImages.length === filteredImages.length
                  ? "Deselect All"
                  : `Selected ${selectedImages.length}`}
            </label>

            {selectedImages.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFolderDialogOpen(true)}
                  className="ml-2"
                >
                  <Folder className="h-4 w-4 mr-1" />
                  Move to Folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="ml-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedImages.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {filteredImages.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <InfoIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Matching Images</h3>
              <p className="text-muted-foreground">
                Try adjusting your search query or filters to find images.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                imageData={imageDataCache[image.id] || null}
                isSelected={selectedImages.includes(image.id)}
                toggleSelection={toggleImageSelection}
                onImageClick={handleImageClick}
                onMoveToFolder={moveImagesToFolder}
                onDeleteClick={(image) => {
                  setSelectedImage(image);
                  setDeleteDialogOpen(true);
                }}
                onReRunClick={handleReRunImage}
                availableFolders={availableFolders}
                onContextMenu={handleContextMenu}
                getImageFolder={getImageFolder}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel (right side) */}
      <div className={`w-full md:w-64 space-y-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <FilterPanel
          availableTags={availableTags}
          selectedTags={selectedTags}
          toggleTagFilter={toggleTagFilter}

          availableModels={availableModels}
          selectedModels={selectedModels}
          toggleModelFilter={toggleModelFilter}

          availableLoras={availableLoras}
          selectedLoras={selectedLoras}
          toggleLoraFilter={toggleLoraFilter}

          availableFolders={availableFolders}
          onFolderSelect={(folder) => moveImagesToFolder(selectedImages, folder)}

          clearAllFilters={clearAllFilters}
        />
      </div>

      {/* Context Menu */}
      {contextMenuPosition && (
        <div
          ref={contextMenuRef}
          className="fixed bg-background border rounded-md shadow-md py-1 z-50"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`
          }}
        >
          <div className="hover:bg-accent px-3 py-1.5 cursor-pointer" onClick={() => {
            setFolderDialogOpen(true);
          }}>
            <Folder className="h-4 w-4 inline-block mr-2" />
            Move to folder ({selectedImages.length})
          </div>
          <div className="hover:bg-accent px-3 py-1.5 cursor-pointer text-destructive" onClick={() => {
            setDeleteDialogOpen(true);
          }}>
            <Trash2 className="h-4 w-4 inline-block mr-2" />
            Delete ({selectedImages.length})
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            {selectedImages.length > 1
              ? `Are you sure you want to delete ${selectedImages.length} images?`
              : 'Are you sure you want to delete this image?'
            } This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={selectedImages.length > 1 ? handleBulkDelete : handleDeleteImage}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="folder-select" className="text-sm font-medium">
                Select Destination Folder
              </label>
              <Select
                value={selectedFolder}
                onValueChange={setSelectedFolder}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  {availableFolders.map(folder => (
                    <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <Input
                id="new-folder"
                placeholder="Or create new folder"
                className="flex-1"
                onChange={(e) => {
                  if (e.target.value && !availableFolders.includes(e.target.value)) {
                    setSelectedFolder(e.target.value);
                  }
                }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Moving {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'} to folder.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => moveImagesToFolder(selectedImages, selectedFolder)}
              disabled={isLoading || !selectedFolder}
            >
              {isLoading ? 'Moving...' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Prompt Dialog */}
      <Dialog open={createPromptDialogOpen} onOpenChange={setCreatePromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="prompt-name" className="text-sm font-medium">
                Prompt Name
              </label>
              <Input
                id="prompt-name"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                placeholder="Enter prompt name"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This will create a new prompt using the settings from this image.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePromptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePrompt} disabled={!newPromptName.trim()}>
              Create Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Details Dialog - Using the new component */}
      <ImageDetailsDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        selectedImage={selectedImage}
        imageData={selectedImage ? imageDataCache[selectedImage.id] : null}
        onCreatePrompt={handleOpenCreatePromptDialog}
        onReRunImage={handleReRunImage}
        onDownload={handleDownload}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        getImageFolder={getImageFolder}
      />
    </div>
  );
}