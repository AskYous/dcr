import { FC, useEffect, useState } from 'react';
import { DockerImage } from '../types';

interface ImageDetailsProps {
  image: DockerImage;
  registryUrl: string;
  onClose: () => void;
}

interface ImageManifest {
  schemaVersion?: number;
  mediaType?: string;
  config?: {
    mediaType: string;
    size: number;
    digest: string;
  };
  layers?: Array<{
    mediaType: string;
    size: number;
    digest: string;
  }>;
  history?: Array<{
    created?: string;
    created_by?: string;
    comment?: string;
  }>;
  annotations?: Record<string, string>;
  size?: number;
  [key: string]: any;
}

export const ImageDetails: FC<ImageDetailsProps> = ({ image, registryUrl, onClose }) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(
    image.tags.length > 0 ? image.tags[0] : null
  );
  const [manifest, setManifest] = useState<ImageManifest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("ImageDetails mounted for image:", image.name);

    const fetchManifest = async () => {
      if (!selectedTag) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log(`Fetching manifest for ${image.name}:${selectedTag}`);
        const response = await fetch(`/api/v2/${image.name}/manifests/${selectedTag}`, {
          headers: {
            'Accept': 'application/vnd.docker.distribution.manifest.v2+json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch manifest: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Manifest data:", data);
        setManifest(data);
      } catch (err) {
        console.error('Error fetching manifest:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch manifest');
      } finally {
        setIsLoading(false);
      }
    };

    fetchManifest();
  }, [image.name, selectedTag, registryUrl]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  console.log("Rendering ImageDetails modal");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{image.name}</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
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
          </div>

          {isLoading ? (
            <div className="loading-container small">
              <div className="loading-spinner"></div>
              <p>Loading manifest...</p>
            </div>
          ) : error ? (
            <div className="error-message">
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