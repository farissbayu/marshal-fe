import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyCounts } from '#/sim/batch/counts'
import type { BatchReport } from '#/sim/batch/report'
import { useBatchStore } from '#/stores/batch'
import { BatchForm } from '../BatchForm'
import { BatchProgress } from '../BatchProgress'
import { EventLog } from '../EventLog'
import { FlowCards } from '../FlowCards'
import { ReportCard } from '../ReportCard'

function reset(partial: Partial<ReturnType<typeof useBatchStore.getState>> = {}) {
  useBatchStore.setState({
    status: 'queued',
    progress: 0,
    counts: null,
    events: [],
    cases: [],
    proposals: [],
    report: null,
    pastReport: null,
    ...partial,
  })
}

const sampleReport: BatchReport = {
  batchId: 'BAT-01',
  status: 'done',
  generatedAt: '2026-01-01T00:00:00.000Z',
  model: 'gemini-2.5-flash',
  batchSize: 3,
  counts: { requested: 3, created: 3, finished: 3, shipped: 2, rework: 1, exceptions: 0 },
  durationS: 120,
  flowKpis: emptyCounts(),
  labels: { total: 3, caught: 2, missed: 1, falseAlarms: 0, cars: [] },
  gemini: {
    batchSize: 3,
    summary: 'ok',
    perFlow: Array.from({ length: 7 }, (_, i) => ({
      flow: i + 1,
      name: 'x',
      observation: `obs ${i + 1}`,
      issues: [],
      recommendation: '',
    })),
    topIssues: [],
    recommendations: [],
    risk: 'low',
    degraded: true,
  },
  log: { events: [], exceptions: [] },
}

describe('dashboard components', () => {
  beforeEach(() => reset())

  it('validates the car count and disables Run while active', () => {
    render(<BatchForm />)
    const button = screen.getByRole('button', { name: /run batch/i })
    const input = screen.getByLabelText(/cars in this batch/i)
    fireEvent.change(input, { target: { value: '7' } })
    expect(button).toBeDisabled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '3' } })
    expect(button).toBeEnabled()
  })

  it('shows not_triggered text for flows 6 and 7 without an incident', () => {
    reset({ counts: emptyCounts() })
    render(<FlowCards />)
    expect(screen.getByText('Yard')).toBeInTheDocument()
    expect(screen.getByText('Adversarial')).toBeInTheDocument()
    expect(screen.getAllByText('Not triggered (no incident)')).toHaveLength(2)
  })

  it('shows the event log empty state', () => {
    render(<EventLog />)
    expect(screen.getByText(/waiting for the batch to start/i)).toBeInTheDocument()
  })

  it('renders the report with a degraded badge and 7 flow entries', () => {
    reset({ report: sampleReport })
    render(<ReportCard />)
    expect(screen.getByText(/gemini unavailable, generated from metrics/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Flow \d — x/)).toHaveLength(7)
  })

  it('shows a progress bar reflecting status', () => {
    reset({ status: 'running', progress: 40, counts: emptyCounts() })
    render(<BatchProgress />)
    expect(screen.getByText('running')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '40')
  })
})
