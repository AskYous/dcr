import { FC, useCallback, useMemo, useState } from 'react';
import { DockerImage } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ImageDetails } from './ImageDetails';
import { LoadingState } from './LoadingState';
import { RegistryHelp } from './RegistryHelp';

interface ImageListProps {
  images: DockerImage[];
  isLoading: boolean;
  error: string | null;
  registryUrl: string;
  onRefresh: () => void;
}

export const ImageList: FC<ImageListProps> = ({
  images,
  isLoading,
  error,
  registryUrl,
  onRefresh
}) => {
  const [selectedImage, setSelectedImage] = useState<DockerImage | null>(null);
  const [showGcHelp, setShowGcHelp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleImageClick = useCallback((image: DockerImage) => {
    console.log("Image clicked:", image.name);
    setSelectedImage(image);
  }, []);

  const handleCloseImageDetails = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleImageUpdated = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const handleShowGcHelp = useCallback(() => {
    setShowGcHelp(true);
  }, []);

  const handleCloseGcHelp = useCallback(() => {
    setShowGcHelp(false);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Filter images based on search term
  const filteredImages = useMemo(() => {
    if (!searchTerm.trim()) return images;

    const term = searchTerm.toLowerCase();
    return images.filter(image =>
      image.name.toLowerCase().includes(term) ||
      image.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }, [images, searchTerm]);

  if (isLoading) {
    return <LoadingState message="Loading images..." />;
  }

  if (error) {
    return <ErrorState title="Error Loading Images" message={error} />;
  }

  return (
    <>
      <div className="images-header">
        <div className="header-title">
          <h2>Docker Images</h2>
        </div>

        <div className="header-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search images or tags..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
              aria-label="Search images or tags"
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <button
            className="action-button gc-button"
            onClick={handleShowGcHelp}
          >
            Garbage Collection Help
          </button>

          <RegistryHelp />
        </div>
      </div>

      {filteredImages.length === 0 ? (
        <EmptyState
          title="No Images Found"
          message={searchTerm ? "No images match your search criteria." : "No images available in the registry."}
        />
      ) : (
        <div className="images-list">
          {filteredImages.map((image) => (
            <div
              key={image.name}
              className="image-item"
              onClick={() => handleImageClick(image)}
              tabIndex={0}
              role="button"
              aria-label={`View details for ${image.name} with ${image.tags.length} tags`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleImageClick(image);
                }
              }}
            >
              <h3 className="image-name">{image.name}</h3>
              <div className="tags-container">
                <h4 className="tags-header">
                  Tags: <span className="tag-count">({image.tags.length})</span>
                </h4>
                <div className="tags" role="list" aria-label={`Tags for ${image.name}`}>
                  {image.tags.length > 0 ? (
                    image.tags.slice(0, 10).map((tag) => (
                      <span key={tag} className="tag" role="listitem">{tag}</span>
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
      )}

      {selectedImage && (
        <ImageDetails
          image={selectedImage}
          registryUrl={registryUrl}
          onClose={handleCloseImageDetails}
          onImageUpdated={handleImageUpdated}
        />
      )}

      {/* Garbage Collection Help Dialog - Manual instructions only */}
      <ConfirmationDialog
        isOpen={showGcHelp}
        title="Garbage Collection Instructions"
        message={
          <div className="gc-help-content">
            <p>
              Garbage collection in Docker Registry must be run directly on the server where the registry is hosted.
              It cannot be triggered through the API.
            </p>

            <h4>To run garbage collection:</h4>

            <div className="code-block">
              <pre>
                {`# If running as a Docker container:
docker exec -it registry registry garbage-collect /etc/docker/registry/config.yml

# To also remove unreferenced blobs:
docker exec -it registry registry garbage-collect --delete-untagged /etc/docker/registry/config.yml

# After garbage collection, restart the registry:
docker restart registry`}
              </pre>
            </div>

            <h4>Important Notes:</h4>
            <ul>
              <li>It's recommended to stop the registry or put it in read-only mode before running garbage collection</li>
              <li>Garbage collection only removes blobs that aren't referenced by any manifests</li>
              <li>To fully reclaim space, you need to use the <code>--delete-untagged</code> flag</li>
              <li>After garbage collection, the registry should be restarted</li>
            </ul>

            <p>
              For more information, see the <a href="https://docs.docker.com/registry/garbage-collection/" target="_blank" rel="noopener noreferrer">Docker Registry Garbage Collection documentation</a>.
            </p>
          </div>
        }
        confirmLabel="Close"
        isDestructive={false}
        onConfirm={handleCloseGcHelp}
        onCancel={handleCloseGcHelp}
      />
    </>
  );
}; 