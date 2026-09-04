import { createBrowserMediaFeatures } from './browserMediaFeatures'

const localFile = (name, overrides = {}) => ({
    name,
    size: 1024,
    lastModified: 1_700_000_000_000,
    webkitRelativePath: '',
    ...overrides,
})

const createFeatures = (selections = {}) => {
    let urlIndex = 0
    const pickFiles = jest.fn(async ({ type, directory }) => (
        selections[`${type}:${directory ? 'folder' : 'files'}`] || []
    ))
    const features = createBrowserMediaFeatures({
        pickFiles,
        createObjectURL: (file) => `blob:utaha-${file.name || 'raster'}-${++urlIndex}`,
        now: () => '2026-08-30T08:00:00.000Z',
    })
    return { features, pickFiles }
}

describe('browser media feature bridge', () => {
    test('selects and shares music, video, and photo files with their components', async () => {
        const { features } = createFeatures({
            'music:files': [localFile('Utaha - Metronome.mp3')],
            'video:files': [localFile('episode.mp4')],
            'photo:files': [localFile('portrait.png')],
        })

        const audioPaths = await features.selectAudioFiles()
        const audioInfo = await features.getAudioInfo(audioPaths)
        await features.addMusicToLibrary(audioInfo)

        const videoPaths = await features.selectVideoFiles()
        const videoInfo = await features.getVideoInfo(videoPaths)
        await features.addVideoToLibrary(videoInfo)

        const photos = await features.getImages('file')

        expect((await features.getMusicList())[0]).toMatchObject({
            title: 'Metronome',
            artist: 'Utaha',
            type: 'music',
        })
        expect((await features.getVideoList())[0]).toMatchObject({ title: 'episode', type: 'video' })
        expect(photos[0]).toMatchObject({
            title: 'portrait',
            fileName: 'portrait.png',
            type: 'photo',
        })
        await expect(features.getImageListShowConfig()).resolves.toMatchObject({
            slideImagesCache: [expect.objectContaining({ title: 'portrait' })],
        })
    })

    test('imports folders into the shared home summary and emits library updates', async () => {
        const { features, pickFiles } = createFeatures({
            'music:folder': [
                localFile('one.flac', { webkitRelativePath: 'album/one.flac' }),
                localFile('notes.txt', { webkitRelativePath: 'album/notes.txt' }),
            ],
        })
        const listener = jest.fn()
        const removeListener = features.onMessage('music-list-updated', listener)

        await expect(features.importMusicFolder()).resolves.toEqual({ status: 'imported', count: 1 })
        const summary = await features.getHomeSummary({ limitPerSection: 12 })

        expect(pickFiles).toHaveBeenCalledWith(expect.objectContaining({ type: 'music', directory: true }))
        expect(summary.counts).toEqual({ music: 1, video: 0, photo: 0 })
        expect(summary.recentAdded).toHaveLength(1)
        expect(listener).toHaveBeenCalledWith([expect.objectContaining({ title: 'one' })])

        removeListener()
    })

    test('keeps canceled selections empty and applies the continue-playing threshold', async () => {
        const { features } = createFeatures({
            'video:files': [localFile('clip.webm')],
        })

        await expect(features.importPhotoFolder()).resolves.toEqual({ status: 'canceled', count: 0 })
        const videoPaths = await features.selectVideoFiles()
        const [video] = await features.getVideoInfo(videoPaths)
        await features.addVideoToLibrary([video])
        await features.updatePlaybackProgress({
            mediaId: video.id,
            type: 'video',
            positionMs: 20_000,
            durationMs: 100_000,
        })
        expect((await features.getHomeSummary()).continueItems).toHaveLength(1)

        await features.updatePlaybackProgress({
            mediaId: video.id,
            type: 'video',
            positionMs: 91_000,
            durationMs: 100_000,
        })
        expect((await features.getHomeSummary()).continueItems).toHaveLength(0)
    })
})
