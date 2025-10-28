'use client';

import { useState, useEffect } from 'react';
import { getRelativeTime } from '@/lib/utils';

interface RelativeTimeProps {
  date: Date | string;
  short?: boolean;
}

export function RelativeTime({ date, short = false }: RelativeTimeProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render a placeholder on server, actual time on client
  if (!isClient) {
    return <span className="text-xs text-gray-500">Calculating...</span>;
  }

  return (
    <span className="text-xs text-gray-500">
      {getRelativeTime(date, short)}
    </span>
  );
}
