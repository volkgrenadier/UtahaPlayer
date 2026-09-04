import React from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import VinylPlayer from './VinylPlayer'

describe('VinylPlayer', () => {
    test('represents playback through stable CSS state without timer-driven SVG animation', () => {
        const { rerender } = render(<VinylPlayer isPlaying onTogglePlay={() => {}} />)
        const player = screen.getByRole('button', { name: '暂停唱片播放' })
        const record = screen.getByTestId('vinyl-record')

        expect(player).toHaveClass('is-playing')
        expect(record).toBeInTheDocument()

        rerender(<VinylPlayer isPlaying={false} onTogglePlay={() => {}} />)
        expect(screen.getByRole('button', { name: '开始唱片播放' })).not.toHaveClass('is-playing')
        expect(screen.getByTestId('vinyl-record')).toBe(record)
    })

    test('supports keyboard playback and renders the current cover', () => {
        const onTogglePlay = jest.fn()
        render(
            <VinylPlayer
                coverImage="blob:cover"
                labelColor="#9d2f5c"
                onTogglePlay={onTogglePlay}
            />
        )

        const player = screen.getByRole('button', { name: '开始唱片播放' })
        fireEvent.keyDown(player, { key: 'Enter' })
        fireEvent.keyDown(player, { key: ' ' })

        expect(onTogglePlay).toHaveBeenCalledTimes(2)
        expect(screen.getByTestId('vinyl-cover')).toHaveAttribute('src', 'blob:cover')
        expect(player).toHaveStyle('--vinyl-label: #9d2f5c')
        expect(screen.queryByText(/自然衔接/)).not.toBeInTheDocument()
    })
})
