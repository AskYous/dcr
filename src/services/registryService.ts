/**
 * Docker Registry API Service
 * Handles all interactions with the Docker Registry API
 */

import { DockerImage, ImageManifest } from '../types';
import { apiCache } from './cacheService';

/**
 * Base class for API errors
 */
export class RegistryApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RegistryApiError';
    this.status = status;
  }
}

/**
 * Cache TTL constants (in milliseconds)
 */
const CACHE_TTL = {
  CATALOG: 5 * 60 * 1000,      // 5 minutes
  TAGS: 2 * 60 * 1000,         // 2 minutes
  MANIFEST: 10 * 60 * 1000,    // 10 minutes
  CUMULATIVE: 15 * 60 * 1000   // 15 minutes
};

/**
 * Service for interacting with Docker Registry API
 */
export const registryService = {
  /**
   * Fetches the catalog of images from the registry
   */
  async fetchImageCatalog(abortSignal?: AbortSignal): Promise<string[]> {
    return apiCache.withCache(
      async () => {
        try {
          const response = await fetch('/api/v2/_catalog', {
            signal: abortSignal
          });

          if (!response.ok) {
            throw new RegistryApiError(
              `Failed to fetch catalog: ${response.statusText}`,
              response.status
            );
          }

          const data = await response.json();
          return data.repositories || [];
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
          throw new Error(error instanceof Error ? error.message : 'Failed to fetch image catalog');
        }
      },
      '/api/v2/_catalog',
      undefined,
      CACHE_TTL.CATALOG
    );
  },

  /**
   * Fetches tags for a specific image
   */
  async fetchImageTags(imageName: string, abortSignal?: AbortSignal): Promise<string[]> {
    return apiCache.withCache(
      async () => {
        try {
          const response = await fetch(`/api/v2/${imageName}/tags/list`, {
            signal: abortSignal
          });

          if (!response.ok) {
            throw new RegistryApiError(
              `Failed to fetch tags for ${imageName}: ${response.statusText}`,
              response.status
            );
          }

          const data = await response.json();
          return data.tags || [];
        } catch (error) {
          // Don't log aborted requests as errors
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.log(`Fetch tags request aborted for ${imageName}`);
            throw error;
          }

          console.error(`Error fetching tags for ${imageName}:`, error);
          if (error instanceof RegistryApiError) {
            throw error;
          }
          throw new Error(error instanceof Error ? error.message : `Failed to fetch tags for ${imageName}`);
        }
      },
      `/api/v2/${imageName}/tags/list`,
      undefined,
      CACHE_TTL.TAGS
    );
  },

  /**
   * Fetches all images with their tags
   */
  async fetchAllImages(abortSignal?: AbortSignal): Promise<DockerImage[]> {
    try {
      const repositories = await this.fetchImageCatalog(abortSignal);

      const imagesPromises = repositories.map(async (repo) => {
        try {
          // Check if the request has been aborted before making a new request
          if (abortSignal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }

          const tags = await this.fetchImageTags(repo, abortSignal);
          return { name: repo, tags };
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
          }

          console.warn(`Error fetching tags for ${repo}:`, error);
          return { name: repo, tags: [] };
        }
      });

      return await Promise.all(imagesPromises);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Fetch all images request aborted');
        throw error;
      }

      console.error('Error fetching all images:', error);
      throw error;
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
  async deleteImageTag(imageName: string, tag: string): Promise<boolean> {
    try {
      // First, get the manifest to get the digest
      const manifest = await this.fetchImageManifest(imageName, tag);
      if (!manifest || !manifest.config?.digest) {
        throw new Error(`Could not find digest for ${imageName}:${tag}`);
      }

      // Delete by digest
      const response = await fetch(`/api/v2/${imageName}/manifests/${manifest.config.digest}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/vnd.docker.distribution.manifest.v2+json'
        }
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 405) {
          throw new RegistryApiError(
            `Registry does not allow deletion. The registry server needs to be configured with REGISTRY_STORAGE_DELETE_ENABLED=true.`,
            response.status
          );
        } else {
          throw new RegistryApiError(
            `Failed to delete ${imageName}:${tag}: ${response.statusText}`,
            response.status
          );
        }
      }

      // Clear related caches
      apiCache.remove(`/api/v2/${imageName}/tags/list`);
      apiCache.remove(`/api/v2/${imageName}/manifests/${tag}`);
      apiCache.remove(`/api/v2/${imageName}/cumulative-size`);

      return true;
    } catch (error) {
      console.error(`Error deleting ${imageName}:${tag}:`, error);
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