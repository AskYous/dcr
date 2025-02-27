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
  async fetchImageCatalog(): Promise<string[]> {
    return apiCache.withCache(
      async () => {
        try {
          const response = await fetch('/api/v2/_catalog');

          if (!response.ok) {
            throw new RegistryApiError(
              `Failed to fetch catalog: ${response.statusText}`,
              response.status
            );
          }

          const data = await response.json();
          return data.repositories || [];
        } catch (error) {
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
  async fetchImageTags(imageName: string): Promise<string[]> {
    return apiCache.withCache(
      async () => {
        try {
          const response = await fetch(`/api/v2/${imageName}/tags/list`);

          if (!response.ok) {
            throw new RegistryApiError(
              `Failed to fetch tags for ${imageName}: ${response.statusText}`,
              response.status
            );
          }

          const data = await response.json();
          return data.tags || [];
        } catch (error) {
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
  async fetchAllImages(): Promise<DockerImage[]> {
    try {
      const repositories = await this.fetchImageCatalog();

      const imagesPromises = repositories.map(async (repo) => {
        try {
          const tags = await this.fetchImageTags(repo);
          return { name: repo, tags };
        } catch (error) {
          console.warn(`Error fetching tags for ${repo}:`, error);
          return { name: repo, tags: [] };
        }
      });

      return await Promise.all(imagesPromises);
    } catch (error) {
      console.error('Error fetching all images:', error);
      throw error;
    }
  },

  /**
   * Fetches manifest for a specific image tag
   */
  async fetchImageManifest(imageName: string, tag: string): Promise<ImageManifest> {
    return apiCache.withCache(
      async () => {
        try {
          const response = await fetch(`/api/v2/${imageName}/manifests/${tag}`, {
            headers: {
              'Accept': 'application/vnd.docker.distribution.manifest.v2+json'
            }
          });

          if (!response.ok) {
            throw new RegistryApiError(
              `Failed to fetch manifest for ${imageName}:${tag}: ${response.statusText}`,
              response.status
            );
          }

          return await response.json();
        } catch (error) {
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
    accountForSharedLayers: boolean = true
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
            const manifest = await this.fetchImageManifest(imageName, tag);
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
   * Clears all cached data
   */
  clearCache(): void {
    apiCache.clear();
  }
}; 