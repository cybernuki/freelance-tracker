'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NotificationDropdown } from './notification-dropdown'

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects, clients, quotes..."
              className="pl-10 w-96"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <NotificationDropdown />

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">FL</span>
            </div>
            <span className="text-sm font-medium text-gray-700">Freelancer</span>
          </div>
        </div>
      </div>
    </header>
  )
}
