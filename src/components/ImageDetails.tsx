import { FC, useEffect, useState } from 'react';
import { registryService } from '../services/registryService';
import { DockerImage, ImageManifest } from '../types';
import { formatDate, formatSize } from '../utils/formatters';

interface ImageDetailsProps {
  image: DockerImage;
  registryUrl: string;
  onClose: () => void;
}

interface CumulativeSizeInfo {
  totalSize: number;
  uniqueSize: number;
  tagSizes: Record<string, number>;
  layerCount: number;
}

export const ImageDetails: FC<ImageDetailsProps> = ({ image, registryUrl, onClose }) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(
    image.tags.length > 0 ? image.tags[0] : null
  );
  const [manifest, setManifest] = useState<ImageManifest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSize, setTotalSize] = useState<number | null>(null);
  const [cumulativeSize, setCumulativeSize] = useState<CumulativeSizeInfo | null>(null);
  const [loadingCumulativeSize, setLoadingCumulativeSize] = useState(false);

  useEffect(() => {
    const fetchManifest = async () => {
      if (!selectedTag) return;

      setIsLoading(true);
      setError(null);
      setTotalSize(null);

      try {
        const data = await registryService.fetchImageManifest(image.name, selectedTag);
        setManifest(data);

        // Calculate total size
        const size = registryService.calculateImageSize(data);
        setTotalSize(size);
      } catch (err) {
        console.error('Error fetching manifest:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch manifest');
      } finally {
        setIsLoading(false);
      }
    };

    fetchManifest();
  }, [image.name, selectedTag, registryUrl]);

  // Fetch cumulative size information
  useEffect(() => {
    const fetchCumulativeSize = async () => {
      if (image.tags.length === 0) return;

      setLoadingCumulativeSize(true);

      try {
        const result = await registryService.calculateCumulativeImageSize(
          image.name,
          image.tags,
          true // Account for shared layers
        );

        setCumulativeSize({
          totalSize: result.totalSize,
          uniqueSize: result.uniqueSize,
          tagSizes: result.tagSizes,
          layerCount: result.layerDigests.size
        });
      } catch (err) {
        console.error('Error calculating cumulative size:', err);
        // Don't show error to user, just log it
      } finally {
        setLoadingCumulativeSize(false);
      }
    };

    fetchCumulativeSize();
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

  return (
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
  );
}; 