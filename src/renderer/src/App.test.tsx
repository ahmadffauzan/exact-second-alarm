import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const api = {
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  setEnabled: vi.fn(),
  onRing: vi.fn(() => () => undefined),
  onChanged: vi.fn(() => () => undefined),
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.list.mockResolvedValue([])
    Object.defineProperty(window, 'alarmApi', { value: api, configurable: true })
  })

  it('opens the exact-second alarm form from the empty state', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByText('Quiet for now.')
    await user.click(screen.getByRole('button', { name: 'Create first alarm' }))

    expect(screen.getByRole('heading', { name: 'New alarm' })).toBeInTheDocument()
    expect(screen.getByLabelText('Exact time · HH:MM:SS')).toHaveAttribute('step', '1')
  })

  it('saves a daily alarm', async () => {
    const user = userEvent.setup()
    api.save.mockResolvedValue([])
    render(<App />)

    await screen.findByText('Quiet for now.')
    await user.click(screen.getByRole('button', { name: 'Create first alarm' }))
    await user.type(screen.getByLabelText('Alarm name'), 'Deep work')
    await user.click(screen.getByRole('button', { name: 'Set alarm' }))

    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Deep work',
          schedule: { type: 'daily' },
          enabled: true,
        }),
      ),
    )
  })
})
