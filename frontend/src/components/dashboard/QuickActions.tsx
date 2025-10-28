'use client';

import { Button } from '@/components/ui/Button';
import { Plus, Play, Pause, Settings } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <Button className="flex items-center justify-center gap-2 w-full sm:w-auto">
        <Plus className="h-4 w-4" />
        <span>New Strategy</span>
      </Button>
      <Button
        variant="outline"
        className="flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <Play className="h-4 w-4" />
        <span>Start All</span>
      </Button>
      <Button
        variant="outline"
        className="flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <Pause className="h-4 w-4" />
        <span>Pause All</span>
      </Button>
      <Button
        variant="outline"
        className="flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <Settings className="h-4 w-4" />
        <span>Quick Settings</span>
      </Button>
    </div>
  );
}
