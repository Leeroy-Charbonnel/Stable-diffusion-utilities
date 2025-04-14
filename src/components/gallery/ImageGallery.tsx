// src/components/gallery/ImageGallery.tsx
import React, { useState, useEffect } from 'react';
import { useImages } from '../../context/ImageContext';
import { ImageWithBlob } from '../../types/image';
import { ImageCard } from './ImageCard';
import { ImageDetail } from './ImageDetail';
import { BulkTagging } from './BulkTagging';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Search, SlidersHorizontal, Tag, Trash2, X } from 'lucide-react';
import { TagList } from '../tag/TagList';
import { getDistinctTags } from '../../lib/utils';
import { Badge } from '../ui/badge';

export const ImageGallery: React.FC = () => {
  const { images, deleteImage, filterImagesByTags, searchImages } = useImages();
  const [selectedImage, setSelectedImage] = useState<ImageWithBlob | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBulkTaggingOpen, setIsBulkTaggingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmImage, setDeleteConfirmImage] = useState<ImageWithBlob | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  //Get all unique tags from images
  const allTags = getDistinctTags(images);
  
  //Filter images based on search query and selected tags
  const filteredImages = React.useMemo(() => {
    let result = images;
    
    //First filter by tags if any are selected
    if (selectedTags.length > 0) {
      result = filterImagesByTags(selectedTags);
    }
    
    //Then filter by search query if any
    if (searchQuery) {
      //If already filtered by tags, search within those results
      result = searchQuery ? searchImages(searchQuery) : result;
    }
    
    return result;
  }, [images, searchQuery, selectedTags, filterImagesByTags, searchImages]);

  const handleViewImage = (image: ImageWithBlob) => {
    setSelectedImage(image);
    setIsDetailOpen(true);
  };

  const handleEditImage = (image: ImageWithBlob) => {
    setSelectedImage(image);
    setIsDetailOpen(true);
  };

  const handleDeleteImage = (image: ImageWithBlob) => {
    setDeleteConfirmImage(image);
  };

  const confirmDelete = () => {
    if (deleteConfirmImage) {
      deleteImage(deleteConfirmImage.id);
      setDeleteConfirmImage(null);
      
      //If the deleted image is currently being viewed, close the detail view
      if (selectedImage && selectedImage.id === deleteConfirmImage.id) {
        setIsDetailOpen(false);
        setSelectedImage(null);
      }
    }
  };
  
  const confirmBulkDelete = () => {
    //Delete all filtered images
    filteredImages.forEach(image => {
      deleteImage(image.id);
    });
    setBulkDeleteConfirm(false);
  };
  
  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => [...prev, tag]);
  };
  
  const handleTagDeselect = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };
  
  const openBulkTagging = () => {
    setIsBulkTaggingOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search images by prompt or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} className="mr-2" />
            Filters
            {selectedTags.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </div>
        
        {showFilters && (
          <div className="border rounded-md p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Filter by Tags</h3>
              {(selectedTags.length > 0 || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
            
            <TagList
              tags={allTags}
              selectedTags={selectedTags}
              onTagSelect={handleTagSelect}
              onTagDeselect={handleTagDeselect}
            />
          </div>
        )}
      </div>
      
      {filteredImages.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'}
            {(selectedTags.length > 0 || searchQuery) && ' (filtered)'}
          </p>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openBulkTagging}
              disabled={filteredImages.length === 0}
            >
              <Tag size={16} className="mr-2" />
              Bulk Tag Editor
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteConfirm(true)}
              disabled={filteredImages.length === 0}
            >
              <Trash2 size={16} className="mr-2" />
              Delete {filteredImages.length === images.length ? 'All' : 'Filtered'} Images
            </Button>
          </div>
        </div>
      )}
      
      {filteredImages.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <p className="text-muted-foreground">
            {images.length === 0
              ? "No images found. Generate some images first!"
              : "No images match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map(image => (
            <ImageCard
              key={image.id}
              image={image}
              onView={handleViewImage}
              onEdit={handleEditImage}
              onDelete={handleDeleteImage}
            />
          ))}
        </div>
      )}
      
      {/* Image Detail Modal */}
      <ImageDetail
        image={selectedImage}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
      
      {/* Bulk Tagging Modal */}
      <BulkTagging
        images={filteredImages}
        isOpen={isBulkTaggingOpen}
        onClose={() => setIsBulkTaggingOpen(false)}
      />
      
      {/* Delete Single Image Confirmation Dialog */}
      <AlertDialog 
        open={!!deleteConfirmImage}
        onOpenChange={(open) => !open && setDeleteConfirmImage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog 
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Images</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'}? 
              {filteredImages.length !== images.length && ' Only currently filtered images will be deleted.'}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete {filteredImages.length} {filteredImages.length === 1 ? 'Image' : 'Images'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};