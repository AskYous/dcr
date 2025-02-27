import { FC, useState } from 'react';
import { DockerImage } from '../types';
import { ImageDetails } from './ImageDetails';

interface ImageListProps {
  images: DockerImage[];
  isLoading: boolean;
  error: string | null;
  registryUrl: string;
}

export const ImageList: FC<ImageListProps> = ({ images, isLoading, error, registryUrl }) => {
  const [selectedImage, setSelectedImage] = useState<DockerImage | null>(null);

  const handleImageClick = (image: DockerImage) => {
    console.log("Image clicked:", image.name);
    setSelectedImage(image);
  };

  if (isLoading) {
    return (
      <div className="loading-container" aria-live="polite">
        <div className="loading-spinner"></div>
        <p>Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container" role="alert">
        <h3>Error Loading Images</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Images Found</h3>
        <p>No Docker images were found in this registry.</p>
      </div>
    );
  }

  return (
    <>
      <div className="images-list">
        {images.map((image) => (
          <div
            key={image.name}
            className="image-item"
            onClick={() => handleImageClick(image)}
            tabIndex={0}
            role="button"
            aria-label={`View details for ${image.name}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleImageClick(image);
              }
            }}
          >
            <h3 className="image-name">{image.name}</h3>
            <div className="tags-container">
              <h4 className="tags-header">Tags:</h4>
              <div className="tags">
                {image.tags.length > 0 ? (
                  image.tags.slice(0, 10).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))
                ) : (
                  <span className="no-tags">No tags</span>
                )}
                {image.tags.length > 10 && (
                  <span className="more-tags">+{image.tags.length - 10} more</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <ImageDetails
          image={selectedImage}
          registryUrl={registryUrl}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}; 