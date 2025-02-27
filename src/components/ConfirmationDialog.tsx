import { FC, ReactNode, useEffect } from 'react';

interface ConfirmationDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: FC<ConfirmationDialogProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDestructive = false,
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  // Handle escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="modal-content confirmation-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="dialog-title">{title}</h2>
          <button className="close-button" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <div className="confirmation-message">
            {message}
          </div>

          <div className="confirmation-actions">
            <button
              className="action-button cancel"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </button>

            <button
              className={`action-button confirm ${isDestructive ? 'destructive' : ''}`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 