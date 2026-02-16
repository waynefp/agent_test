'use client'

import { useState } from 'react'
import { Play, Clock, CheckCircle2, AlertCircle, ArrowRight, FileText, Download } from 'lucide-react'

// BEGINNER NOTE: This page visualizes multi-agent pipelines in real-time
// It shows the flow of agents, their status, outputs, and the final report

type AgentStatus = 'pending' | 'running' | 'completed' | 'error'

interface AgentExecution {
  id: string
  name: string
  status: AgentStatus
  output?: string
  startTime?: number
  endTime?: number
  tokensUsed?: number
}

interface FinalReport {
  markdownReport: string
  ttsScript: string | null
  markdownPath: string
  ttsPath: string | null
  audioPath: string | null
  totalTokens: number
  duration: number
}

export default function PipelinePage() {
  const [isRunning, setIsRunning] = useState(false)
  const [agents, setAgents] = useState<AgentExecution[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string>('AI,Longevity')
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null)

  const runPipeline = async () => {
    setIsRunning(true)
    setAgents([])
    setFinalReport(null)

    try {
      const response = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics: selectedTopics })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Handle Server-Sent Events stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'agent_start') {
                setAgents(prev => [...prev, {
                  id: data.agentId,
                  name: data.agentName,
                  status: 'running',
                  startTime: Date.now()
                }])
              } else if (data.type === 'agent_complete') {
                setAgents(prev => prev.map(agent =>
                  agent.id === data.agentId
                    ? { ...agent, status: 'completed', output: data.output, endTime: Date.now(), tokensUsed: data.tokensUsed }
                    : agent
                ))
              } else if (data.type === 'agent_error') {
                setAgents(prev => prev.map(agent =>
                  agent.id === data.agentId
                    ? { ...agent, status: 'error', output: data.error, endTime: Date.now() }
                    : agent
                ))
              } else if (data.type === 'final_report') {
                setFinalReport({
                  markdownReport: data.markdownReport,
                  ttsScript: data.ttsScript,
                  markdownPath: data.markdownPath,
                  ttsPath: data.ttsPath,
                  audioPath: data.audioPath,
                  totalTokens: data.totalTokens,
                  duration: data.duration,
                })
              } else if (data.type === 'pipeline_complete') {
                setIsRunning(false)
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }

      setIsRunning(false)
    } catch (error) {
      console.error('Pipeline error:', error)
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return 'border-blue-500 bg-blue-50'
      case 'completed':
        return 'border-green-500 bg-green-50'
      case 'error':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold">Multi-Agent Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate Daily Briefing with AI-powered research
        </p>
      </div>

      {/* Controls */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium block mb-2">Topics (comma-separated)</label>
            <input
              type="text"
              value={selectedTopics}
              onChange={(e) => setSelectedTopics(e.target.value)}
              placeholder="e.g., AI,Longevity"
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isRunning}
            />
          </div>
          <button
            onClick={runPipeline}
            disabled={isRunning || !selectedTopics.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mt-7"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Running...' : 'Run Pipeline'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {agents.length === 0 && !finalReport ? (
          <div className="text-center text-muted-foreground py-12">
            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No pipeline running</p>
            <p className="text-sm mt-2">Click "Run Pipeline" to generate your daily briefing</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Agent Flow */}
            {agents.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pipeline Progress
                </h2>
                {agents.map((agent, index) => (
                  <div key={agent.id}>
                    {/* Agent Card */}
                    <div className={`border-2 rounded-lg p-4 ${getStatusColor(agent.status)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(agent.status)}
                          <div className="flex-1">
                            <h3 className="font-medium text-lg">{agent.name}</h3>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>Status: {agent.status}</span>
                              {agent.endTime && agent.startTime && (
                                <span>Duration: {((agent.endTime - agent.startTime) / 1000).toFixed(2)}s</span>
                              )}
                              {agent.tokensUsed && (
                                <span>Tokens: {agent.tokensUsed.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow to next agent */}
                    {index < agents.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Final Report */}
            {finalReport && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Daily Briefing Report
                  </h2>
                  {finalReport.markdownPath && (
                    <div className="text-xs text-muted-foreground">
                      Saved to: {finalReport.markdownPath}
                    </div>
                  )}
                </div>

                {/* Audio Player (if available) */}
                {finalReport.audioPath && (
                  <div className="p-4 border rounded-lg bg-card">
                    <h3 className="text-sm font-medium mb-2">🎧 Listen to Briefing</h3>
                    <audio controls className="w-full">
                      <source src={finalReport.audioPath} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {/* Markdown Report */}
                <div className="p-6 border rounded-lg bg-white prose prose-sm max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: finalReport.markdownReport
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/^(.+)$/gm, '<p>$1</p>')
                    }}
                  />
                </div>

                {/* Download Links */}
                <div className="flex gap-2">
                  {finalReport.markdownPath && (
                    <button className="px-4 py-2 border rounded-lg hover:bg-secondary flex items-center gap-2 text-sm">
                      <Download className="h-4 w-4" />
                      Download Markdown
                    </button>
                  )}
                  {finalReport.ttsPath && (
                    <button className="px-4 py-2 border rounded-lg hover:bg-secondary flex items-center gap-2 text-sm">
                      <Download className="h-4 w-4" />
                      Download TTS Script
                    </button>
                  )}
                  {finalReport.audioPath && (
                    <button className="px-4 py-2 border rounded-lg hover:bg-secondary flex items-center gap-2 text-sm">
                      <Download className="h-4 w-4" />
                      Download Audio
                    </button>
                  )}
                </div>

                {/* Summary Stats */}
                <div className="p-4 border rounded-lg bg-card">
                  <h3 className="font-medium mb-2">Pipeline Summary</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Agents</div>
                      <div className="text-2xl font-bold">{agents.length}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Completed</div>
                      <div className="text-2xl font-bold text-green-500">
                        {agents.filter(a => a.status === 'completed').length}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Tokens</div>
                      <div className="text-2xl font-bold">
                        {finalReport.totalTokens.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Duration</div>
                      <div className="text-2xl font-bold">
                        {(finalReport.duration / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
