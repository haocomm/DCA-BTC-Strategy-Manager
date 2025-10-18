'use client'

import { Button } from '@/components/ui/Button'
import { Plus, Play, Pause, Settings } from 'lucide-react'

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-4">
      <Button className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        New Strategy
      </Button>
      <Button variant="outline" className="flex items-center gap-2">
        <Play className="h-4 w-4" />
        Start All
      </Button>
      <Button variant="outline" className="flex items-center gap-2">
        <Pause className="h-4 w-4" />
        Pause All
      </Button>
      <Button variant="outline" className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        Quick Settings
      </Button>
    </div>
  )
}