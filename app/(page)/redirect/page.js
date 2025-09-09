'use client';

import { useEffect } from 'react';

export default function RedirectPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');

    if (url) {
      window.location.href = url;
    }
  }, []);

  return null;
}
