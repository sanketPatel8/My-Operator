import { useEffect, useCallback } from 'react';

export function useClickOutside(ref, handler) {
  const handleClickOutside = useCallback((event) => {
    // Check if ref exists and the clicked target is outside the ref element
    if (ref.current && !ref.current.contains(event.target)) {
      handler(event);
    }
  }, [ref, handler]);

  useEffect(() => {
    // Only add event listeners on client side
    if (typeof window === 'undefined') return;
    
    // Add event listeners for both mouse and touch events
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Cleanup function
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handleClickOutside]);
}