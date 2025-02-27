import { FC, useState } from 'react';

interface DebugPanelProps {
  registryUrl: string;
  onClose: () => void;
}

export const DebugPanel: FC<DebugPanelProps> = ({ registryUrl, onClose }) => {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/v2/');

      if (response.ok) {
        const text = await response.text();
        setTestResult(`Success! Status: ${response.status}. Response: ${text}`);
      } else {
        setTestResult(`Failed with status: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>Debug Panel</h3>
        <button
          onClick={onClose}
          className="close-button"
          aria-label="Close debug panel"
        >
          ×
        </button>
      </div>

      <div className="debug-content">
        <div className="debug-info">
          <div className="info-row">
            <span className="info-label">Registry URL:</span>
            <span className="info-value">{registryUrl}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Proxy URL:</span>
            <span className="info-value">/api</span>
          </div>
        </div>

        <button
          onClick={testConnection}
          disabled={isLoading}
          className="test-button"
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>

        {testResult && (
          <div className="test-result">
            <pre>{testResult}</pre>
          </div>
        )}

        <div className="debug-help">
          <h4>Troubleshooting Tips:</h4>
          <ul>
            <li>Make sure your Docker registry supports API v2</li>
            <li>Check if your registry requires authentication</li>
            <li>Verify that your registry allows cross-origin requests</li>
            <li>Try accessing the registry directly in a new tab</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 