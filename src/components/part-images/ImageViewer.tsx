import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Image as ImageIcon, RefreshCw, FolderOpen, Trash2, CheckSquare, FolderClosed } from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { ImageMetadata } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

//Import our component files
import { FilterPanel } from './FilterPanel';
import { ImageCard } from './ImageCard';
import { ImageDetailsDialog } from './ImageDetailsDialog';
import { generateUUID } from '@/lib/utils';

export function ImageViewer() {
  const { fileSystemApi, promptsApi } = useApi();

  const [generatedImages, setGeneratedImages] = useState<ImageMetadata[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageMetadata[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [availableFolders, setAvailableFolders] = useState<string[]>(['default']);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedLoras, setSelectedLoras] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  //Image details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  //Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<ImageMetadata | null>(null);
  const [isMultiDelete, setIsMultiDelete] = useState(false);

  //Move to folder dialog state
  const [moveFolderDialogOpen, setMoveFolderDialogOpen] = useState(false);
  const [targetFolder, setTargetFolder] = useState<string>('default');

  //Function to load images from server
  async function loadImagesFromServer() {
    try {
      const loadedImages = await fileSystemApi.getAllImageMetadata();
      setGeneratedImages(loadedImages);
    } catch (error) {
      console.error('Failed to load images from server:', error);
    }
  }

  //Load available folders from server
  const loadFolders = async () => {
    try {
      const folders = await fileSystemApi.getFolders();
      setAvailableFolders(folders.sort());
    } catch (error) {
      console.error('Failed to load folders:', error);
      setAvailableFolders(['default']);
    }
  };

  //Load images on mount
  useEffect(() => {
    loadImagesFromServer();
    loadFolders();
  }, []);

  //Refresh images and folders
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadImagesFromServer(),
        loadFolders()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  //Open output folder
  const openOutputFolder = async () => {
    try {
      await fileSystemApi.openOutputFolder();
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  //Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => prev.includes(imageId) ? prev.filter(id => id !== imageId) : [...prev, imageId]);
  };

  //Select all images
  const selectAllImages = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(img => img.id));
    }
  };

  //Navigate between images
  const handleImageNavigation = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === -1 || filteredImages.length <= 1) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : filteredImages.length - 1;
    } else {
      newIndex = selectedImageIndex < filteredImages.length - 1 ? selectedImageIndex + 1 : 0;
    }

    const image = filteredImages[newIndex];
    setSelectedImageIndex(newIndex);
    setSelectedImage(image);
    setImageUrl(fileSystemApi.getImageUrl(image.id));
  };

  //Extract all unique tags, models, and loras from images
  useEffect(() => {
    const tags = new Set<string>();
    const models = new Set<string>();
    const loras = new Set<string>();

    generatedImages.forEach(img => {
      img.tags?.forEach(tag => tags.add(tag));
      if (img.model) { models.add(img.model); }
      if (img.loras && img.loras.length > 0) {
        img.loras.forEach(lora => loras.add(lora.name));
      }
    });

    setAvailableTags(Array.from(tags).sort());
    setAvailableModels(Array.from(models).sort());
    setAvailableLoras(Array.from(loras).sort());
  }, [generatedImages]);

  //Filter images
  useEffect(() => {
    let filtered = [...generatedImages];

    //Search by prompt, tags, or name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.prompt.toLowerCase().includes(query) ||
          (img.name && img.name.toLowerCase().includes(query)) ||
          img.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    //Filter by selected tags (all selected tags must be present)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((img) => selectedTags.every((tag) => img.tags.includes(tag)));
    }
    //Filter by selected models
    if (selectedModels.length > 0) {
      filtered = filtered.filter((img) => img.model && selectedModels.includes(img.model));
    }
    //Filter by selected loras
    if (selectedLoras.length > 0) {
      filtered = filtered.filter((img) => img.loras && img.loras.some((lora) => selectedLoras.includes(lora.name)));
    }
    //Filter by selected folders
    if (selectedFolders.length > 0) {
      filtered = filtered.filter((img) => selectedFolders.includes(img.folder || 'default'));
    }
    //Sort by creation date, newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredImages(filtered);
  }, [generatedImages, searchQuery, selectedTags, selectedModels, selectedLoras, selectedFolders]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const toggleModelFilter = (model: string) => {
    setSelectedModels((prev) => prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]);
  };

  const toggleLoraFilter = (lora: string) => {
    setSelectedLoras((prev) => prev.includes(lora) ? prev.filter((l) => l !== lora) : [...prev, lora]);
  };

  const toggleFolderFilter = (folder: string) => {
    setSelectedFolders((prev) => prev.includes(folder) ? prev.filter((f) => f !== folder) : [...prev, folder]);
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedModels([]);
    setSelectedLoras([]);
    setSelectedFolders([]);
    setSearchQuery('');
  };

  const handleImageClick = (image: ImageMetadata) => {
    const index = filteredImages.findIndex(img => img.id === image.id);
    setSelectedImageIndex(index);
    setSelectedImage(image);
    setImageUrl(fileSystemApi.getImageUrl(image.id));
    setDetailsDialogOpen(true);
  };

  const handleMoveToFolder = async (imageId: string, folder: string) => {
    setIsLoading(true);
    try {
      const success = await fileSystemApi.moveImageToFolder(imageId, folder);
      if (success) {
        await loadImagesFromServer();
      }
    } catch (error) {
      console.error('Error moving image to folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveSelectedToFolder = async () => {
    if (selectedImages.length === 0 || !targetFolder) return;

    setIsLoading(true);
    try {
      for (const imageId of selectedImages) {
        await fileSystemApi.moveImageToFolder(imageId, targetFolder);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setSelectedImages([]);
      await loadImagesFromServer();
      setMoveFolderDialogOpen(false);
    } catch (error) {
      console.error('Error moving images to folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (image: ImageMetadata) => {
    setImageToDelete(image);
    setIsMultiDelete(false);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSelected = () => {
    if (selectedImages.length === 0) return;
    setIsMultiDelete(true);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsLoading(true);
    try {
      if (isMultiDelete) {
        //Delete multiple images
        const deletePromises = selectedImages.map(imageId =>
          fileSystemApi.deleteImage(imageId)
        );
        await Promise.all(deletePromises);
        setSelectedImages([]);
      } else if (imageToDelete) {
        //Delete a single image
        await fileSystemApi.deleteImage(imageToDelete.id);
      }

      await loadImagesFromServer();
    } catch (error) {
      console.error('Error deleting image(s):', error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  const handleUpdateImageName = async (imageId: string, name: string): Promise<void> => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      // Update image metadata
      const success = await fileSystemApi.updateImageMetadata(imageId, { name });

      if (success) {
        // Update local state if the selected image is the one being updated
        if (selectedImage && selectedImage.id === imageId) {
          setSelectedImage({ ...selectedImage, name });
        }

        // Refresh image list
        await loadImagesFromServer();
      } else {
        console.error('Failed to update image name');
      }
    } catch (error) {
      console.error('Error updating image name:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePrompt = async (image: ImageMetadata) => {
    try {
      //Get existing prompts
      const existingPrompts = await promptsApi.getAllPrompts();

      //Create a new prompt from the image
      const newPrompt = {
        id: generateUUID(),
        isOpen: false,
        name: image.name || image.prompt.substring(0, 20) + "...",
        text: image.prompt,
        negativePrompt: image.negativePrompt || "",
        seed: image.seed,
        steps: image.steps,
        sampler: image.sampler,
        model: image.model,
        width: image.width,
        height: image.height,
        runCount: 1,
        tags: [...image.tags],
        loras: image.loras || [],
        currentRun: 0,
        status: "idle",
      };

      //Add the new prompt to the list
      const updatedPrompts = [...existingPrompts, newPrompt];
      await promptsApi.saveAllPrompts(updatedPrompts);

      //Close the dialog
      setDetailsDialogOpen(false);

      //Show confirmation or switch to prompts tab
      alert("Prompt created successfully!");
    } catch (error) {
      console.error('Error creating prompt:', error);
    }
  };

  const getImageFolder = (image: ImageMetadata) => {
    return image.folder || 'default';
  };

  const handleDetailsDownload = () => {
    if (!selectedImage || !imageUrl) return;

    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${selectedImage.id}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      })
      .catch(error => {
        console.error('Error downloading image:', error);
      });
  };

  //If there are no images
  if (generatedImages.length === 0) {
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-4">
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
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-[1600px] mx-auto">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
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
              <Input type="search" placeholder="Search images..." className="pl-8 w-64" value={searchQuery} onChange={handleSearchChange} />
            </div>
          </div>

          {selectedImages.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={selectAllImages}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                {selectedImages.length === filteredImages.length ? 'Deselect All' : 'Select All'}
              </Button>

              <Button
                onClick={() => setMoveFolderDialogOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <FolderClosed className="mr-2 h-4 w-4" />
                Move ({selectedImages.length})
              </Button>

              <Button
                onClick={handleDeleteSelected}
                variant="destructive"
                size="sm"
                className="flex items-center"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedImages.length})
              </Button>
            </div>
          )}
        </div>

        {filteredImages.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Matching Images</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                isSelected={selectedImages.includes(image.id)}
                toggleSelection={toggleImageSelection}
                onImageClick={handleImageClick}
                onMoveToFolder={handleMoveToFolder}
                onCreatePrompt={handleCreatePrompt}
                onDeleteClick={handleDeleteClick}
                availableFolders={availableFolders}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel (right side) */}
      <div className={`w-full md:w-64 space-y-6 block`}>
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
          selectedFolders={selectedFolders}
          onFolderSelect={toggleFolderFilter}

          clearAllFilters={clearAllFilters}
        />
      </div>

      {
        selectedImage && (
          <ImageDetailsDialog
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            image={selectedImage}
            imageUrl={imageUrl}
            onCreatePrompt={handleCreatePrompt}
            onDownload={handleDetailsDownload}
            onAddTag={async (tag) => {
              if (!selectedImage) return;

              const updatedImage = {
                ...selectedImage,
                tags: [...selectedImage.tags, tag]
              };

              setSelectedImage(updatedImage);
              await fileSystemApi.updateImageMetadata(selectedImage.id, {
                tags: [...selectedImage.tags, tag]
              });
              await loadImagesFromServer();
              return Promise.resolve();
            }}
            onRemoveTag={async (tag) => {
              if (!selectedImage) return;

              const updatedTags = selectedImage.tags.filter(t => t !== tag);
              const updatedImage = {
                ...selectedImage,
                tags: updatedTags
              };

              setSelectedImage(updatedImage);
              await fileSystemApi.updateImageMetadata(selectedImage.id, {
                tags: updatedTags
              });
              await loadImagesFromServer();
              return Promise.resolve();
            }}
            getImageFolder={getImageFolder}
            onNavigate={handleImageNavigation}
            onDeleteClick={handleDeleteClick}
            onMoveToFolder={handleMoveToFolder}
            availableFolders={availableFolders}
            onUpdateName={handleUpdateImageName}
          />
        )
      }

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {isMultiDelete
                ? `This will permanently delete ${selectedImages.length} selected images. This action cannot be undone.`
                : "This will permanently delete the image. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to Folder Dialog */}
      <AlertDialog open={moveFolderDialogOpen} onOpenChange={setMoveFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Images to Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Select a destination folder for the {selectedImages.length} selected images.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Select value={targetFolder} onValueChange={setTargetFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                {availableFolders.map(folder => (
                  <SelectItem key={folder} value={folder}>
                    {folder}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveSelectedToFolder}>
              Move Images
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}