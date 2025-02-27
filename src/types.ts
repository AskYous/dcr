/**
 * Type definitions for the Docker Registry Explorer
 */

export interface DockerCredentials {
  registryUrl: string;
  username?: string;
  password?: string;
}

export interface DockerImage {
  name: string;
  tags: string[];
}

export interface ImageManifest {
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
    empty_layer?: boolean;
  }>;
  annotations?: Record<string, string>;
  size?: number;
  [key: string]: any;
}

export interface AuthState {
  credentials: DockerCredentials;
  authenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
}

export interface RegistryState {
  images: DockerImage[];
  isLoadingImages: boolean;
  imagesError: string | null;
} 