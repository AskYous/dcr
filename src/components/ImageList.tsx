import { DockerImage } from '../types';

interface ImageListProps {
  images: DockerImage[];
  isLoading: boolean;
  error: string | null;
}

export const ImageList = ({ images, isLoading, error }: ImageListProps) => {
  if (isLoading) {
    return <div className="loading-container">Loading images...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (images.length === 0) {
    return <div className="empty-state">No images found in this registry</div>;
  }

  return (
    <div className="images-list">
      {images.map((image) => (
        <div key={image.name} className="image-item">
          <h3>{image.name}</h3>
          <div className="tags">
            {image.tags.length > 0 ? (
              image.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))
            ) : (
              <span className="no-tags">No tags</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}; 