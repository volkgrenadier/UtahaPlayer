import React from 'react'
import '@testing-library/jest-dom'
import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeftNav from './LeftNav'

describe('LeftNav', () => {
    test('prevents every navigation item from being dragged', () => {
        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <LeftNav />
            </MemoryRouter>
        )

        screen.getAllByRole('link').forEach((link) => {
            expect(link).toHaveAttribute('draggable', 'false')
            const dragEvent = createEvent.dragStart(link)
            fireEvent(link, dragEvent)
            expect(dragEvent.defaultPrevented).toBe(true)
        })
        expect(screen.queryByText('LOCAL')).not.toBeInTheDocument()
    })
})
