import React from 'react';
import { Card, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Folder, CheckSquare, Image as ImageIcon, Trash2, Repeat } from 'lucide-react';
import { ImageMetadata } from '@/types';

interface ImageCardProps {
  image: ImageMetadata;
  imageData: string | null;
  isSelected: boolean;
  toggleSelection: (imageId: string) => void;
  onImageClick: (image: ImageMetadata) => void;
  onMoveToFolder: (imageId: string, folder: string) => void;
  onDeleteClick: (image: ImageMetadata) => void;
  onReRunClick: (image: ImageMetadata) => void;
  availableFolders: string[];
  onContextMenu: (e: React.MouseEvent, imageId: string) => void;
  getImageFolder: (image: ImageMetadata) => string;
}

export function ImageCard({
  image,
  imageData,
  isSelected,
  toggleSelection,
  onImageClick,
  onMoveToFolder,
  onDeleteClick,
  onReRunClick,
  availableFolders,
  onContextMenu,
  getImageFolder
}: ImageCardProps) {
  const imageFolder = getImageFolder(image);

  return (
    <Card
      key={image.id}
      className={`overflow-hidden group relative ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onContextMenu={(e) => onContextMenu(e, image.id)}
    >
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          className="h-5 w-5 bg-background/80"
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(image.id);
          }}
        />
      </div>

      <div className="absolute top-2 right-2 z-10">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-background/80 rounded-full">
              <Folder className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Move to folder</h4>
              <div className="space-y-1">
                {availableFolders.map(folder => (
                  <div
                    key={folder}
                    className={`text-sm px-2 py-1.5 rounded cursor-pointer flex items-center ${imageFolder === folder
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                    onClick={() => {
                      if (imageFolder !== folder) {
                        onMoveToFolder(image.id, folder);
                      }
                    }}
                  >
                    {imageFolder === folder && <CheckSquare className="mr-2 h-4 w-4" />}
                    {folder}
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="relative aspect-square">
        {imageData ? (
          <img
            src={imageData}
            alt={image.prompt}
            className="object-cover w-full h-full cursor-pointer"
            onClick={() => onImageClick(image)}
            loading="lazy"
          />
        ) : (
          <div
            className="flex items-center justify-center w-full h-full bg-muted cursor-pointer"
            onClick={() => onImageClick(image)}
          >
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onImageClick(image)}
          >
            Details
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-accent"
            onClick={() => onReRunClick(image)}
          >
            <Repeat className="h-4 w-4 mr-1" />
            Re-run
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeleteClick(image)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardFooter className="flex flex-col items-start pt-4">
        <div className="flex justify-between w-full items-start mb-2">
          <p className="text-sm line-clamp-2 font-medium">
            {image.prompt.substring(0, 100)}
            {image.prompt.length > 100 ? "..." : ""}
          </p>
        </div>

        <div className="flex justify-between w-full">
          {imageFolder !== 'default' && (
            <Badge variant="outline" className="mr-1">
              <Folder className="h-3 w-3 mr-1" />
              {imageFolder}
            </Badge>
          )}

          <div className="flex-1" />

          {image.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 justify-end">
              {image.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {image.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{image.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}