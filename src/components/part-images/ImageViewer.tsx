import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Image as ImageIcon, RefreshCw, FolderOpen, Trash2 } from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { ImageMetadata } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

//Import our component files
import { FilterPanel } from './FilterPanel';
import { ImageCard } from './ImageCard';
import { ImageDetailsDialog } from './ImageDetailsDialog';

export function ImageViewer() {
  const { fileSystemApi } = useApi();

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
  const [showFilters, setShowFilters] = useState(true);

  //Image details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

  //Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<ImageMetadata | null>(null);

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
      filtered = filtered.filter((img) => selectedTags.every((tag) => img.tags.includes(tag)));
    }
    //Filter by selected models
    if (selectedModels.length > 0) {
      filtered = filtered.filter((img) =>img.model && selectedModels.includes(img.model));
    }
    //Filter by selected folders
    if (selectedFolders.length > 0) {
      filtered = filtered.filter((img) =>selectedFolders.includes(img.folder || 'default'));
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
    setSelectedImage(image);
    setImageData(fileSystemApi.getImageUrl(image));
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

  const handleDeleteClick = (image: ImageMetadata) => {
    setImageToDelete(image);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;

    setIsLoading(true);
    try {
      const success = await fileSystemApi.deleteImage(imageToDelete.id);
      if (success) {
        await loadImagesFromServer();
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  const handleReRunClick = (image: ImageMetadata) => {
    //TODO: Implement re-run functionality
    console.log('Re-run image:', image);
  };

  const handleContextMenu = (e: React.MouseEvent, imageId: string) => {
    e.preventDefault();
    //Optional: implement custom context menu
  };

  const getImageFolder = (image: ImageMetadata) => {
    return image.folder || 'default';
  };

  const handleDetailsDownload = () => {
    if (!selectedImage || !imageData) return;

    //Create a download link
    const a = document.createElement('a');
    a.href = imageData;
    a.download = `${selectedImage.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  //If there are no images
  if (generatedImages.length === 0) {
    return (
      <div>
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
    <div className="flex flex-col md:flex-row gap-4">
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
            <Button onClick={() => { }} variant="destructive" size="sm" className="flex items-center">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedImages.length})
            </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                isSelected={selectedImages.includes(image.id)}
                toggleSelection={toggleImageSelection}
                onImageClick={handleImageClick}
                onMoveToFolder={handleMoveToFolder}
                onDeleteClick={handleDeleteClick}
                onReRunClick={handleReRunClick}
                availableFolders={availableFolders}
                onContextMenu={handleContextMenu}
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
          onFolderSelect={toggleFolderFilter}

          clearAllFilters={clearAllFilters}
        />
      </div>

      {/* Image Details Dialog */}
      <ImageDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        selectedImage={selectedImage}
        imageData={imageData}
        onCreatePrompt={() => {
          setDetailsDialogOpen(false);
        }}
        onReRunImage={handleReRunClick}
        onDownload={handleDetailsDownload}
        onAddTag={async () => { }}
        onRemoveTag={async () => { }}
        getImageFolder={getImageFolder}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the image. This action cannot be undone.
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
    </div>
  );
}