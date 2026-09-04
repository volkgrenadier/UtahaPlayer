import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { NotificationProvider } from '../../utils/NotificationProvider'
import Photo from './Photo'

jest.mock('./PhotoEditor/PhotoEditor.js', () => ({ selectedImage, onExit, onSaved }) => (
    <section data-testid="photo-editor">
        <span>正在编辑 {selectedImage?.title}</span>
        <button type="button" onClick={onExit}>返回图片预览</button>
        <button
            type="button"
            onClick={() => onSaved({
                ...selectedImage,
                id: 'photo-copy',
                path: 'C:\\Pictures\\Portrait-edited.jpg',
                src: 'C:\\Pictures\\Portrait-edited.jpg',
                title: 'Portrait edited',
            }, {
                mode: 'copy',
                outputPath: 'C:\\Pictures\\Portrait-edited.jpg',
                sourcePath: selectedImage?.path,
            })}
        >
            模拟保存副本
        </button>
    </section>
))

const image = {
    id: 'photo-1',
    type: 'photo',
    path: 'C:\\Pictures\\Portrait.jpg',
    src: 'C:\\Pictures\\Portrait.jpg',
    thumbnailUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    title: 'Portrait',
    width: 1200,
    height: 1800,
    size: 2 * 1024 * 1024,
}

const renderPhoto = () => {
    const router = createMemoryRouter([{
        path: '/',
        element: (
            <NotificationProvider>
                <Photo />
            </NotificationProvider>
        ),
    }], {
        initialEntries: ['/'],
        future: { v7_relativeSplatPath: true },
    })

    return render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
}

describe('Photo preview and edit workflow', () => {
    beforeEach(() => {
        window.electronFeatures = {
            getImageListShowConfig: jest.fn().mockResolvedValue({
                slideImagesCache: [image],
                photoPlayCount: 4,
            }),
            updateSlideShowConfig: jest.fn(),
            recordMediaActivity: jest.fn().mockResolvedValue(undefined),
            openSlideShow: jest.fn(),
        }
        window.confirm = jest.fn(() => true)
    })

    afterEach(() => {
        delete window.electronFeatures
        jest.restoreAllMocks()
    })

    test('opens a read-only preview before mounting the editor', async () => {
        renderPhoto()

        expect(screen.getByRole('heading', { name: '选择一张图片开始浏览' })).toBeInTheDocument()
        const previewButton = await screen.findByRole('button', { name: '预览 Portrait' })

        fireEvent.click(previewButton)

        expect(await screen.findByRole('heading', { name: 'Portrait' })).toBeInTheDocument()
        expect(screen.getByText(/JPG.*1200 × 1800.*2\.0 MB/)).toBeInTheDocument()
        expect(screen.queryByTestId('photo-editor')).not.toBeInTheDocument()
        expect(window.electronFeatures.recordMediaActivity).toHaveBeenCalledWith({
            mediaId: 'photo-1',
            path: image.path,
            type: 'photo',
        })
    })

    test('enters editing explicitly and returns to preview after back or save', async () => {
        renderPhoto()

        fireEvent.click(await screen.findByRole('button', { name: '预览 Portrait' }))
        fireEvent.click(screen.getByRole('button', { name: '编辑图片' }))
        expect(screen.getByTestId('photo-editor')).toHaveTextContent('正在编辑 Portrait')

        fireEvent.click(screen.getByRole('button', { name: '返回图片预览' }))
        expect(await screen.findByRole('heading', { name: 'Portrait' })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: '编辑图片' }))
        fireEvent.click(screen.getByRole('button', { name: '模拟保存副本' }))

        expect(await screen.findByRole('heading', { name: 'Portrait edited' })).toBeInTheDocument()
        expect(screen.queryByTestId('photo-editor')).not.toBeInTheDocument()
        await waitFor(() => expect(window.electronFeatures.updateSlideShowConfig).toHaveBeenCalled())
    })
})
