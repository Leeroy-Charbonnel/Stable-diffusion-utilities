// src/components/gallery/ImageCard.tsx
import React from 'react';
import { ImageWithBlob } from '../../types/image';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Download, Info } from 'lucide-react';

interface ImageCardProps {
  image: ImageWithBlob;
  onView: (image: ImageWithBlob) => void;
  onEdit: (image: ImageWithBlob) => void;
  onDelete: (image: ImageWithBlob) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  onView,
  onEdit,
  onDelete,
}) => {
  const handleDownload = () => {
    //Create a download link for the image
    if (image.blob) {
      const url = URL.createObjectURL(image.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (image.url) {
      //If we have a URL but not a blob, fetch the image first
      fetch(image.url)
        .then(response => response.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = image.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col">
      <div 
        className="relative aspect-square overflow-hidden cursor-pointer"
        onClick={() => onView(image)}
      >
        {(image.url || image.blob) ? (
          <img
            src={image.url || (image.blob ? URL.createObjectURL(image.blob) : '')}
            alt={image.prompt.substring(0, 30)}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            Loading image...
          </div>
        )}
        
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant="secondary" className="opacity-80">
            {image.width}×{image.height}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-3 flex-grow">
        <p className="text-sm line-clamp-2 mb-2">
          {image.prompt}
        </p>
        
        <div className="flex flex-wrap gap-1 mt-1">
          {image.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {image.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{image.tags.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 gap-1 flex justify-between">
        <Button size="sm" variant="ghost" onClick={() => onView(image)}>
          <Info size={16} />
          <span className="sr-only">View details</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit(image)}>
          <Edit size={16} />
          <span className="sr-only">Edit tags</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDownload}>
          <Download size={16} />
          <span className="sr-only">Download</span>
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(image)}>
          <Trash2 size={16} />
          <span className="sr-only">Delete</span>
        </Button>
      </CardFooter>
    </Card>
  );
};