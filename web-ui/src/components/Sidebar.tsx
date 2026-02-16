'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MessageCircle,
  GitBranch,
  Settings,
  Newspaper,
  Calendar,
  Upload,
  Twitter,
  Search,
  ChevronRight,
  Bot
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedSection, setExpandedSection] = useState<string | null>('navigation')

  const navigationItems = [
    { href: '/', icon: MessageCircle, label: 'Chat' },
    { href: '/pipeline', icon: GitBranch, label: 'Multi-Agent Pipeline' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  const skillActions = [
    { id: 'briefing', icon: Newspaper, label: 'Daily Briefing', description: 'AI & Longevity news' },
    { id: 'last30days', icon: Calendar, label: 'Last 30 Days', description: 'Activity summary' },
    { id: 'gdrive-sync', icon: Upload, label: 'Sync to Google Drive', description: 'Backup learning guides' },
    { id: 'search-reddit', icon: Search, label: 'Search Reddit', description: 'Reddit research tool' },
    { id: 'search-x', icon: Twitter, label: 'Search X/Twitter', description: 'X/Twitter research' },
  ]

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="w-64 h-screen bg-card border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">Agent SDK</h1>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="p-2">
          <button
            onClick={() => toggleSection('navigation')}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span>Navigation</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${expandedSection === 'navigation' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'navigation' && (
            <div className="mt-1 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions (Skills) */}
        <div className="p-2">
          <button
            onClick={() => toggleSection('skills')}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span>Quick Actions</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${expandedSection === 'skills' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'skills' && (
            <div className="mt-1 space-y-1">
              {skillActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      // TODO: Trigger skill execution
                      console.log('Execute skill:', action.id)
                    }}
                    className="w-full flex items-start gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{action.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          <div className="font-medium">Phase 20: Web UI</div>
          <div className="mt-1">Powered by Claude Sonnet 4</div>
        </div>
      </div>
    </div>
  )
}
