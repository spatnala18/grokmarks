// ============================================
// Toast Notification Component
// ============================================

import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import './Toast.css';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    error: <AlertCircle size={18} />,
    success: <CheckCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-icon">{icons[toast.type]}</div>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-dismiss" onClick={() => onDismiss(toast.id)}>
        <X size={16} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
