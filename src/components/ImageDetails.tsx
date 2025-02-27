import { FC, useEffect, useRef, useState } from 'react';
import { RegistryApiError, registryService } from '../services/registryService';
import { DockerImage, ImageManifest } from '../types';
import { formatDate, formatSize } from '../utils/formatters';
import { ConfirmationDialog } from './ConfirmationDialog';

interface ImageDetailsProps {
  image: DockerImage;
  registryUrl: string;
  onClose: () => void;
  onImageUpdated: () => void;
}

interface CumulativeSizeInfo {
  totalSize: number;
  uniqueSize: number;
  tagSizes: Record<string, number>;
  layerCount: number;
}

export const ImageDetails: FC<ImageDetailsProps> = ({ image, registryUrl, onClose, onImageUpdated }) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(
    image.tags.length > 0 ? image.tags[0] : null
  );
  const [manifest, setManifest] = useState<ImageManifest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSize, setTotalSize] = useState<number | null>(null);
  const [cumulativeSize, setCumulativeSize] = useState<CumulativeSizeInfo | null>(null);
  const [loadingCumulativeSize, setLoadingCumulativeSize] = useState(false);

  // Delete tag state
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Refs for abort controllers
  const manifestAbortController = useRef<AbortController | null>(null);
  const cumulativeSizeAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchManifest = async () => {
      if (!selectedTag) return;

      // Cancel any in-flight requests
      if (manifestAbortController.current) {
        manifestAbortController.current.abort();
      }

      // Create a new abort controller for this request
      manifestAbortController.current = new AbortController();

      setIsLoading(true);
      setError(null);
      setTotalSize(null);

      try {
        const data = await registryService.fetchImageManifest(
          image.name,
          selectedTag,
          manifestAbortController.current.signal
        );
        setManifest(data);

        // Calculate total size
        const size = registryService.calculateImageSize(data);
        setTotalSize(size);
      } catch (err) {
        // Don't set error state for aborted requests
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log('Manifest fetch aborted');
          return;
        }

        console.error('Error fetching manifest:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch manifest');
      } finally {
        setIsLoading(false);
      }
    };

    fetchManifest();

    // Cleanup function to abort requests when component unmounts or selectedTag changes
    return () => {
      if (manifestAbortController.current) {
        manifestAbortController.current.abort();
        manifestAbortController.current = null;
      }
    };
  }, [image.name, selectedTag, registryUrl]);

  // Fetch cumulative size information
  useEffect(() => {
    const fetchCumulativeSize = async () => {
      if (image.tags.length === 0) return;

      // Cancel any in-flight requests
      if (cumulativeSizeAbortController.current) {
        cumulativeSizeAbortController.current.abort();
      }

      // Create a new abort controller for this request
      cumulativeSizeAbortController.current = new AbortController();

      setLoadingCumulativeSize(true);

      try {
        const result = await registryService.calculateCumulativeImageSize(
          image.name,
          image.tags,
          true, // Account for shared layers
          cumulativeSizeAbortController.current.signal
        );

        setCumulativeSize({
          totalSize: result.totalSize,
          uniqueSize: result.uniqueSize,
          tagSizes: result.tagSizes,
          layerCount: result.layerDigests.size
        });
      } catch (err) {
        // Don't log errors for aborted requests
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log('Cumulative size calculation aborted');
          return;
        }

        console.error('Error calculating cumulative size:', err);
        // Don't show error to user, just log it
      } finally {
        setLoadingCumulativeSize(false);
      }
    };

    fetchCumulativeSize();

    // Cleanup function to abort requests when component unmounts
    return () => {
      if (cumulativeSizeAbortController.current) {
        cumulativeSizeAbortController.current.abort();
        cumulativeSizeAbortController.current = null;
      }
    };
  }, [image.name, image.tags]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDeleteTag = async () => {
    if (!tagToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await registryService.deleteImageTag(image.name, tagToDelete);

      // Update the image tags list
      onImageUpdated();

      // If the deleted tag was the selected tag, select another one
      if (tagToDelete === selectedTag) {
        const remainingTags = image.tags.filter(tag => tag !== tagToDelete);
        setSelectedTag(remainingTags.length > 0 ? remainingTags[0] : null);
      }

      // Close the confirmation dialog
      setTagToDelete(null);
    } catch (err) {
      console.error('Error deleting tag:', err);

      // Provide more helpful error messages
      if (err instanceof RegistryApiError && err.status === 405) {
        setDeleteError(
          "The registry server doesn't allow deletion. The server administrator needs to enable deletion by setting REGISTRY_STORAGE_DELETE_ENABLED=true in the registry configuration."
        );
      } else {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete tag');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 id="modal-title">{image.name}</h2>
            <button className="close-button" onClick={onClose} aria-label="Close">×</button>
          </div>

          <div className="modal-body">
            <div className="size-summary">
              <div className="tag-selector">
                <label htmlFor="tag-select">Select Tag:</label>
                <select
                  id="tag-select"
                  value={selectedTag || ''}
                  onChange={e => setSelectedTag(e.target.value)}
                  disabled={isLoading}
                >
                  {image.tags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>

                {selectedTag && (
                  <button
                    className="delete-tag-button"
                    onClick={() => setTagToDelete(selectedTag)}
                    title={`Delete tag ${selectedTag}`}
                    aria-label={`Delete tag ${selectedTag}`}
                  >
                    Delete Tag
                  </button>
                )}

                {totalSize !== null && (
                  <div className="total-size">
                    <span className="size-label">Tag Size:</span>
                    <span className="size-value">{formatSize(totalSize)}</span>
                  </div>
                )}
              </div>

              {cumulativeSize && (
                <div className="cumulative-size-info">
                  <div className="size-item">
                    <span className="size-label">All Tags (Raw):</span>
                    <span className="size-value">{formatSize(cumulativeSize.totalSize)}</span>
                    <span className="size-help" title="Total size of all tags without accounting for shared layers">ⓘ</span>
                  </div>
                  <div className="size-item">
                    <span className="size-label">Storage Size:</span>
                    <span className="size-value">{formatSize(cumulativeSize.uniqueSize)}</span>
                    <span className="size-help" title="Actual storage used, accounting for shared layers">ⓘ</span>
                  </div>
                  <div className="size-item">
                    <span className="size-label">Unique Layers:</span>
                    <span className="size-value">{cumulativeSize.layerCount}</span>
                  </div>
                </div>
              )}

              {loadingCumulativeSize && (
                <div className="loading-cumulative">
                  <div className="mini-spinner"></div>
                  <span>Calculating storage size...</span>
                </div>
              )}
            </div>

            {deleteError && (
              <div className="error-message" role="alert">
                <strong>Error deleting tag:</strong> {deleteError}
              </div>
            )}

            {isLoading ? (
              <div className="loading-container small" aria-live="polite">
                <div className="loading-spinner"></div>
                <p>Loading manifest...</p>
              </div>
            ) : error ? (
              <div className="error-message" role="alert">
                {error}
              </div>
            ) : manifest ? (
              <div className="manifest-details">
                <div className="detail-section">
                  <h3>General Information</h3>
                  <div className="detail-row">
                    <span className="detail-label">Schema Version:</span>
                    <span className="detail-value">{manifest.schemaVersion}</span>
                  </div>
                  {manifest.mediaType && (
                    <div className="detail-row">
                      <span className="detail-label">Media Type:</span>
                      <span className="detail-value">{manifest.mediaType}</span>
                    </div>
                  )}
                  {manifest.config && (
                    <div className="detail-row">
                      <span className="detail-label">Config Digest:</span>
                      <span className="detail-value digest">{manifest.config.digest}</span>
                    </div>
                  )}
                </div>

                {manifest.layers && manifest.layers.length > 0 && (
                  <div className="detail-section">
                    <h3>Layers ({manifest.layers.length})</h3>
                    <div className="layers-list">
                      {manifest.layers.map((layer, index) => (
                        <div key={index} className="layer-item">
                          <div className="layer-header">
                            <span className="layer-index">Layer {index + 1}</span>
                            <span className="layer-size">{formatSize(layer.size)}</span>
                          </div>
                          <div className="layer-digest">{layer.digest}</div>
                          <div className="layer-media-type">{layer.mediaType}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {manifest.history && manifest.history.length > 0 && (
                  <div className="detail-section">
                    <h3>History</h3>
                    <div className="history-list">
                      {manifest.history.map((item, index) => (
                        <div key={index} className="history-item">
                          {item.created && (
                            <div className="history-created">
                              <span className="history-label">Created:</span>
                              <span className="history-value">{formatDate(item.created)}</span>
                            </div>
                          )}
                          {item.created_by && (
                            <div className="history-command">
                              <span className="history-label">Command:</span>
                              <span className="history-value command">{item.created_by}</span>
                            </div>
                          )}
                          {item.comment && (
                            <div className="history-comment">
                              <span className="history-label">Comment:</span>
                              <span className="history-value">{item.comment}</span>
                            </div>
                          )}
                          {item.empty_layer && (
                            <div className="history-empty-layer">
                              <span className="history-label">Empty Layer:</span>
                              <span className="history-value">Yes</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {manifest.annotations && Object.keys(manifest.annotations).length > 0 && (
                  <div className="detail-section">
                    <h3>Annotations</h3>
                    <div className="annotations-list">
                      {Object.entries(manifest.annotations).map(([key, value]) => (
                        <div key={key} className="annotation-item">
                          <span className="annotation-key">{key}:</span>
                          <span className="annotation-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state small">
                No manifest data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Tag Deletion */}
      <ConfirmationDialog
        isOpen={tagToDelete !== null}
        title="Delete Tag"
        message={
          <>
            <p>Are you sure you want to delete the tag <strong>{tagToDelete}</strong> from image <strong>{image.name}</strong>?</p>
            <p className="warning-text">This action cannot be undone. The tag will be permanently removed from the registry.</p>
          </>
        }
        confirmLabel="Delete Tag"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteTag}
        onCancel={() => setTagToDelete(null)}
      />
    </>
  );
}; 