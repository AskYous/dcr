/**
 * Docker Registry API Service
 * Handles all interactions with the Docker Registry API
 */

import { DockerImage, ImageManifest, RegistryError } from '../types';
import { apiCache } from './cacheService';

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  CATALOG: 5 * 60 * 1000,      // 5 minutes
  TAGS: 2 * 60 * 1000,         // 2 minutes
  MANIFEST: 10 * 60 * 1000,    // 10 minutes
  CUMULATIVE: 15 * 60 * 1000,  // 15 minutes
};

/**
 * Base class for API errors
 */
export class RegistryApiError extends Error implements RegistryError {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RegistryApiError';
    this.status = status;

    // This is needed for proper instanceof checks with custom Error classes
    Object.setPrototypeOf(this, RegistryApiError.prototype);
  }
}

/**
 * Service for interacting with Docker Registry API
 */
export const registryService = {
  /**
   * Fetches the catalog of images from the registry
   * @param abortSignal Optional AbortSignal to cancel the request
   * @returns Promise resolving to an array of image names
   * @throws RegistryApiError if the API request fails
   */
  async fetchImageCatalog(abortSignal?: AbortSignal): Promise<string[]> {
    return apiCache.withCache(
      async () => {
        try {
          const response = await fetch('/api/v2/_catalog', {
            signal: abortSignal,
            headers: {
              'Accept': 'application/json',
            },
          });

          if (!response.ok) {
            throw new RegistryApiError(
              `Failed to fetch catalog: ${response.statusText}`,
              response.status
            );
          }

          const data = await response.json();
          return Array.isArray(data.repositories) ? data.repositories : [];
        } catch (error) {
          // Don't log aborted requests as errors
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.log('Fetch catalog request aborted');
            throw error;
          }

          console.error('Error fetching image catalog:', error);
          if (error instanceof RegistryApiError) {
            throw error;
          }
          throw new RegistryApiError(
            error instanceof Error ? error.message : 'Failed to fetch image catalog',
            500
          );
        }
      },
      '/api/v2/_catalog',
      undefined,
      CACHE_TTL.CATALOG
    );
  },

  /**
   * Fetches tags for a specific image
   * @param imageName Name of the image
   * @param abortSignal Optional AbortSignal to cancel the request
   * @returns Promise resolving to an array of tag names
   * @throws RegistryApiError if the API request fails
   */
  async fetchImageTags(imageName: string, abortSignal?: AbortSignal): Promise<string[]> {
    return apiCache.withCache(
      async () => {
        try {
          const response = await fetch(`/api/v2/${imageName}/tags/list`, {
            signal: abortSignal,
            headers: {
              'Accept': 'application/json',
            },
          });

          if (!response.ok) {
            throw new RegistryApiError(
              `Failed to fetch tags for ${imageName}: ${response.statusText}`,
              response.status
            );
          }

          const data = await response.json();
          return Array.isArray(data.tags) ? data.tags : [];
        } catch (error) {
          // Don't log aborted requests as errors
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.log(`Fetch tags request for ${imageName} aborted`);
            throw error;
          }

          console.error(`Error fetching tags for ${imageName}:`, error);
          if (error instanceof RegistryApiError) {
            throw error;
          }
          throw new RegistryApiError(
            error instanceof Error ? error.message : `Failed to fetch tags for ${imageName}`,
            500
          );
        }
      },
      `/api/v2/${imageName}/tags/list`,
      undefined,
      CACHE_TTL.TAGS
    );
  },

  /**
   * Fetches all images with their tags
   * @param abortSignal Optional AbortSignal to cancel the request
   * @returns Promise resolving to an array of DockerImage objects
   * @throws RegistryApiError if the API request fails
   */
  async fetchAllImages(abortSignal?: AbortSignal): Promise<DockerImage[]> {
    try {
      // Fetch the catalog of images
      const imageNames = await this.fetchImageCatalog(abortSignal);

      // Create an AbortController for each tag request
      // This allows us to abort all pending requests if the main request is aborted
      const controllers: AbortController[] = [];

      // Create a promise for each image to fetch its tags
      const imagePromises = imageNames.map(async (name) => {
        try {
          // Check if the main request has been aborted
          if (abortSignal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }

          // Create a new AbortController for this request
          const controller = new AbortController();
          controllers.push(controller);

          // If the main request is aborted, abort this request too
          if (abortSignal) {
            abortSignal.addEventListener('abort', () => controller.abort());
          }

          // Fetch tags for this image
          const tags = await this.fetchImageTags(name, controller.signal);

          return {
            name,
            tags: tags.sort((a, b) => {
              // Try to sort numerically if both tags are numbers
              const numA = Number(a);
              const numB = Number(b);
              if (!isNaN(numA) && !isNaN(numB)) {
                return numB - numA; // Descending order
              }
              // Otherwise sort alphabetically
              return b.localeCompare(a);
            })
          };
        } catch (error) {
          // If this request was aborted, propagate the abort
          if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
          }

          console.warn(`Error fetching tags for ${name}:`, error);
          // Return the image with an empty tags array
          return { name, tags: [] };
        }
      });

      // Wait for all image promises to resolve
      const images = await Promise.all(imagePromises);

      // Sort images alphabetically
      return images.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      // If the request was aborted, propagate the abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Fetch all images request aborted');
        throw error;
      }

      console.error('Error fetching all images:', error);
      if (error instanceof RegistryApiError) {
        throw error;
      }
      throw new RegistryApiError(
        error instanceof Error ? error.message : 'Failed to fetch all images',
        500
      );
    }
  },

  /**
   * Fetches manifest for a specific image tag
   */
  async fetchImageManifest(imageName: string, tag: string, abortSignal?: AbortSignal): Promise<ImageManifest> {
    return apiCache.withCache(
      async () => {
        try {
          const response = await fetch(`/api/v2/${imageName}/manifests/${tag}`, {
            headers: {
              'Accept': 'application/vnd.docker.distribution.manifest.v2+json'
            },
            signal: abortSignal
          });

          if (!response.ok) {
            throw new RegistryApiError(
              `Failed to fetch manifest for ${imageName}:${tag}: ${response.statusText}`,
              response.status
            );
          }

          return await response.json();
        } catch (error) {
          // Don't log aborted requests as errors
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.log(`Fetch manifest request aborted for ${imageName}:${tag}`);
            throw error;
          }

          console.error(`Error fetching manifest for ${imageName}:${tag}:`, error);
          if (error instanceof RegistryApiError) {
            throw error;
          }
          throw new Error(
            error instanceof Error
              ? error.message
              : `Failed to fetch manifest for ${imageName}:${tag}`
          );
        }
      },
      `/api/v2/${imageName}/manifests/${tag}`,
      undefined,
      CACHE_TTL.MANIFEST
    );
  },

  /**
   * Calculates the total size of an image from its manifest
   */
  calculateImageSize(manifest: ImageManifest): number {
    let totalSize = 0;

    // Add config size if available
    if (manifest.config?.size) {
      totalSize += manifest.config.size;
    }

    // Add layer sizes
    if (manifest.layers && Array.isArray(manifest.layers)) {
      totalSize += manifest.layers.reduce((sum, layer) => sum + (layer.size || 0), 0);
    } else if (manifest.size) {
      // Some registries provide the total size directly
      return manifest.size;
    }

    return totalSize;
  },

  /**
   * Fetches manifests for all tags of an image and calculates cumulative size
   * Optionally accounts for shared layers to provide accurate storage size
   */
  async calculateCumulativeImageSize(
    imageName: string,
    tags: string[],
    accountForSharedLayers: boolean = true,
    abortSignal?: AbortSignal
  ): Promise<{
    totalSize: number;
    uniqueSize: number;
    tagSizes: Record<string, number>;
    layerDigests: Set<string>;
  }> {
    return apiCache.withCache(
      async () => {
        const tagSizes: Record<string, number> = {};
        const allLayers: Record<string, number> = {};
        let totalSize = 0;

        // Fetch manifests for all tags
        const manifestPromises = tags.map(async (tag) => {
          try {
            // Check if the request has been aborted before making a new request
            if (abortSignal?.aborted) {
              throw new DOMException('Aborted', 'AbortError');
            }

            const manifest = await this.fetchImageManifest(imageName, tag, abortSignal);
            const size = this.calculateImageSize(manifest);
            tagSizes[tag] = size;
            totalSize += size;

            // Track unique layers if accounting for shared layers
            if (accountForSharedLayers && manifest.layers) {
              manifest.layers.forEach(layer => {
                if (layer.digest && layer.size) {
                  allLayers[layer.digest] = layer.size;
                }
              });
            }

            return manifest;
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
              throw error;
            }

            console.warn(`Error fetching manifest for ${imageName}:${tag}:`, error);
            return null;
          }
        });

        await Promise.all(manifestPromises);

        // Calculate unique size (accounting for shared layers)
        const uniqueSize = accountForSharedLayers
          ? Object.values(allLayers).reduce((sum, size) => sum + size, 0)
          : totalSize;

        return {
          totalSize,
          uniqueSize,
          tagSizes,
          layerDigests: new Set(Object.keys(allLayers))
        };
      },
      `/api/v2/${imageName}/cumulative-size`,
      { tags: tags.join(','), accountForSharedLayers },
      CACHE_TTL.CUMULATIVE
    );
  },

  /**
   * Deletes a specific tag from an image
   * Note: This requires the registry to have delete permissions enabled
   */
  async deleteImageTag(imageName: string, tag: string, forceRemove: boolean = false): Promise<boolean> {
    try {
      let manifestDigest: string | null = null;

      // Try to get the manifest digest first
      try {
        const manifest = await this.fetchImageManifest(imageName, tag);
        manifestDigest = manifest.digest;
      } catch (error) {
        if (!forceRemove) {
          throw error;
        }
        console.warn(`Could not fetch manifest for ${imageName}:${tag}, but force remove is enabled.`);
      }

      // If we have a digest, try to delete the manifest
      if (manifestDigest) {
        const response = await fetch(`/api/v2/${imageName}/manifests/${manifestDigest}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/vnd.docker.distribution.manifest.v2+json'
          }
        });

        if (!response.ok) {
          // If deletion failed but force remove is enabled, we'll continue
          if (!forceRemove) {
            throw new RegistryApiError(
              `Failed to delete manifest: ${response.statusText}`,
              response.status
            );
          }
          console.warn(`Failed to delete manifest for ${imageName}:${tag}, but force remove is enabled.`);
        }
      }

      // Clear cache for this image
      apiCache.clear();

      return true;
    } catch (error) {
      console.error(`Error deleting image tag ${imageName}:${tag}:`, error);
      throw error;
    }
  },

  /**
   * Runs garbage collection on the registry (if supported)
   * Note: This is a registry-specific operation and may not be available
   */
  async runGarbageCollection(): Promise<boolean> {
    try {
      const response = await fetch('/api/v2/_gc', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new RegistryApiError(
          `Failed to run garbage collection: ${response.statusText}`,
          response.status
        );
      }

      return true;
    } catch (error) {
      console.error('Error running garbage collection:', error);
      throw error;
    }
  },

  /**
   * Clears all cached data
   */
  clearCache(): void {
    apiCache.clear();
  }
}; 