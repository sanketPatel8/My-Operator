"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

// Toast Component
export const Toast = ({
  message,
  type = 'success',
  isVisible,
  onClose,
  duration = 3000,
  position = 'custom-bottom-right' // Default to custom position
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
          <div className="w-5 h-5 rounded-full border border-[#1BC98E] flex items-center justify-center">
      <svg
        className="w-3 h-3 text-[#1BC98E]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
        );
      case 'error':
        return (
          <div className="w-5 h-5 rounded-full border border-[#F44336] flex items-center justify-center">
      <svg
        className="w-3 h-3 text-[#F44336]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
      case 'custom-bottom-right':
        return 'bottom-30 right-50'; // Exactly like image spacing
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'bottom-6 right-8'; // Default to custom
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-[#D5FFEF] border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const toastElement = (
    <div className={`fixed ${getPositionClasses()} z-50`}>
      <div className={`text-[#1B1B1B] rounded-md shadow-md flex items-center px-4 py-2.5 min-w-[300px] max-w-[500px] border ${getBgColor()}`}>
  
  {/* Left Icon (based on type) */}
  <div className="flex-shrink-0 mr-3">
    {getIcon()}
  </div>



        {/* Message */}
        <span className="flex-1 text-sm font-medium">{message}</span>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="ml-4 text-[#000000] hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );

  return createPortal(toastElement, document.body);
};

// Toast Hook
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 4000, position = 'custom-bottom-right') => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration,
      position,
      isVisible: true,
    };

    setToasts(prev => [...prev, newToast]);

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
          duration={0}
          position={toast.position}
        />
      ))}
    </>
  );

  return {
    showToast,
    removeToast,
    ToastContainer,
    success: (message, duration = 4000, position = 'custom-bottom-right') =>
      showToast(message, 'success', duration, position),
    error: (message, duration = 4000, position = 'custom-bottom-right') =>
      showToast(message, 'error', duration, position),
    warning: (message, duration = 4000, position = 'custom-bottom-right') =>
      showToast(message, 'warning', duration, position),
  };
};

// Toast Context for global use
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
