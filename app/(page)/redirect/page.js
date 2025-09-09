'use client';

import { useEffect } from 'react';

export default function RedirectPage() {
  
const params = new URLSearchParams(window.location.search);
const url = params.get("url");
  useEffect(() => {
    
    

    if (url) {
      window.location.href = url;
    }
  }, [url]);

  return null;
}
