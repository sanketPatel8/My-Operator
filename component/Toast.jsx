// components/Toast.js
"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Toast Component
export const Toast = ({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose, 
  duration = 3000,
  position = 'top-right'
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!mounted || !isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.732-.833-2.5 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const toastElement = (
    <div className={`fixed ${getPositionClasses()} z-50 animate-in slide-in-from-top-2 duration-300`}>
      <div className={`${getBgColor()} border rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px] max-w-[500px]`}>
        {getIcon()}
        <span className="text-gray-800 text-sm font-medium flex-1">
          {message}
        </span>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );

  return createPortal(toastElement, document.body);
};

// Toast Hook for easy usage
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration,
      isVisible: true,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => removeToast(toast.id)}
          duration={0} // Disable auto-close since we handle it in showToast
        />
      ))}
    </>
  );

  return {
    showToast,
    removeToast,
    ToastContainer,
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    warning: (message, duration) => showToast(message, 'warning', duration),
  };
};

// Alternative: Simple Toast Context Provider
import { createContext, useContext } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <toast.ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
};

// Usage Example in your ConfigurationForm
/*
// Method 1: Using the hook directly
import { useToast } from '@/components/Toast';

function ConfigurationForm() {
  const { success, error, ToastContainer } = useToast();

  const handleSaveChanges = async () => {
    try {
      // Your save logic...
      success("Account information updated.");
    } catch (err) {
      error("Error updating store");
    }
  };

  return (
    <div>
      // Your JSX...
      <ToastContainer />
    </div>
  );
}

// Method 2: Using Context Provider (Recommended)
// In your _app.js or layout.js
import { ToastProvider } from '@/components/Toast';

export default function App({ Component, pageProps }) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}

// In your components
import { useToastContext } from '@/components/Toast';

function ConfigurationForm() {
  const { success, error } = useToastContext();

  const handleSaveChanges = async () => {
    try {
      // Your save logic...
      success("Account information updated.");
    } catch (err) {
      error("Error updating store");
    }
  };
}
*/