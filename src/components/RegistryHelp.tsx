import { FC, useState } from 'react';

export const RegistryHelp: FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="registry-help">
      <button
        className="help-button"
        onClick={() => setIsOpen(true)}
        aria-label="Registry configuration help"
      >
        Need help configuring your registry?
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content help-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registry Configuration Help</h2>
              <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <h3>Enabling Image Deletion</h3>
              <p>
                By default, Docker Registry doesn't allow image deletion. To enable it, you need to configure
                your registry server with the following environment variable:
              </p>

              <pre className="code-block">
                REGISTRY_STORAGE_DELETE_ENABLED=true
              </pre>

              <p>
                If you're using Docker Compose, add this to your docker-compose.yml file:
              </p>

              <pre className="code-block">
                {`services:
  registry:
    image: registry:2
    environment:
      REGISTRY_STORAGE_DELETE_ENABLED: "true"
    # ... other configuration ...`}
              </pre>

              <h3>Garbage Collection</h3>
              <p>
                After deleting tags, you may need to run garbage collection to reclaim disk space:
              </p>

              <pre className="code-block">
                docker exec -it registry registry garbage-collect /etc/docker/registry/config.yml
              </pre>

              <p>
                For more information, see the <a href="https://docs.docker.com/registry/configuration/" target="_blank" rel="noopener noreferrer">Docker Registry documentation</a>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 