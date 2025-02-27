import { ChangeEvent, FormEvent } from 'react';
import { DockerCredentials } from '../types';

interface AuthFormProps {
  credentials: DockerCredentials;
  isLoading: boolean;
  error: string | null;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
}

export const AuthForm = ({
  credentials,
  isLoading,
  error,
  onInputChange,
  onSubmit
}: AuthFormProps) => {
  return (
    <div className="auth-form-container">
      <h2>Connect to Docker Registry</h2>
      <p className="auth-note">
        Enter the registry URL below. Your browser will prompt for credentials when needed.
      </p>
      <form onSubmit={onSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="registryUrl">Registry URL:</label>
          <input
            type="text"
            id="registryUrl"
            name="registryUrl"
            value={credentials.registryUrl}
            onChange={onInputChange}
            placeholder="e.g., https://registry.hub.docker.com"
            required
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Connecting..." : "Connect"}
        </button>
      </form>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}; 