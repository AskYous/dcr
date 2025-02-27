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
        Registry Help
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
                After deleting tags, you need to run garbage collection to reclaim disk space.
                This must be done directly on the server:
              </p>

              <pre className="code-block">
                {`# If running as a Docker container:
docker exec -it registry registry garbage-collect /etc/docker/registry/config.yml

# To also remove unreferenced blobs:
docker exec -it registry registry garbage-collect --delete-untagged /etc/docker/registry/config.yml

# After garbage collection, restart the registry:
docker restart registry`}
              </pre>

              <h3>Troubleshooting Deletion Issues</h3>
              <p>
                If you encounter "Not Found" errors when trying to delete tags, it may be because:
              </p>

              <ul>
                <li>The manifest is corrupted or missing</li>
                <li>The tag reference exists but the actual content doesn't</li>
                <li>The registry's database is inconsistent</li>
              </ul>

              <p>
                In these cases, you may need to:
              </p>

              <ol>
                <li>Run garbage collection with the <code>--delete-untagged</code> flag</li>
                <li>Restart the registry</li>
                <li>If problems persist, you might need to rebuild the registry or restore from a backup</li>
              </ol>

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