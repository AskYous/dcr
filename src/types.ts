export interface DockerCredentials {
  registryUrl: string;
  username: string;
  password: string;
}

export interface DockerImage {
  name: string;
  tags: string[];
} 