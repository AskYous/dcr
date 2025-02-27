import { useState } from 'react';

interface DebugPanelProps {
  registryUrl: string;
}

export const DebugPanel = ({ registryUrl }: DebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
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

  if (!isOpen) {
    return (
      <button
        className="debug-toggle"
        onClick={() => setIsOpen(true)}
      >
        Show Debug Panel
      </button>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>Debug Panel</h3>
        <button onClick={() => setIsOpen(false)}>Close</button>
      </div>

      <div className="debug-content">
        <p><strong>Registry URL:</strong> {registryUrl}</p>
        <p><strong>Proxy URL:</strong> /api</p>

        <button
          onClick={testConnection}
          disabled={isLoading}
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