'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function Redirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = searchParams.get('url');

    if (url) {
      window.location.href = url;
    }
  }, [searchParams]);

  return null;
}
