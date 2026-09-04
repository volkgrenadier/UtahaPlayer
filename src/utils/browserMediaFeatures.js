const MEDIA_DEFINITIONS = {
    music: {
        accept: 'audio/*,.mp3,.wav,.ogg,.flac,.m4a',
        extensions: new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a']),
    },
    video: {
        accept: 'video/*,.mp4,.webm,.ogg,.ogv,.m4v,.mkv,.avi',
        extensions: new Set(['mp4', 'webm', 'ogg', 'ogv', 'm4v', 'mkv', 'avi']),
    },
    photo: {
        accept: 'image/jpeg,image/png,image/gif,.jpg,.jpeg,.png,.gif',
        extensions: new Set(['jpg', 'jpeg', 'png', 'gif']),
    },
}

const fileExtension = (fileName = '') => String(fileName).split('.').pop().toLowerCase()
const fileStem = (fileName = '') => String(fileName).replace(/\.[^.]+$/, '')

const pickFilesWithInput = ({ accept, directory = false, multiple = true }) => new Promise((resolve) => {
    const input = document.createElement('input')
    let settled = false
    let focusTimer

    const finish = (files = []) => {
        if (settled) return
        settled = true
        window.clearTimeout(focusTimer)
        window.removeEventListener('focus', handleWindowFocus)
        input.remove()
        resolve(Array.from(files))
    }
    const handleWindowFocus = () => {
        focusTimer = window.setTimeout(() => finish(input.files || []), 300)
    }

    input.type = 'file'
    input.accept = accept
    input.multiple = multiple || directory
    input.hidden = true
    if (directory) {
        input.setAttribute('webkitdirectory', '')
        input.setAttribute('directory', '')
    }
    input.addEventListener('change', () => finish(input.files || []), { once: true })
    input.addEventListener('cancel', () => finish([]), { once: true })
    window.addEventListener('focus', handleWindowFocus, { once: true })
    document.body.appendChild(input)
    input.click()
})

const copyRecord = (record) => ({
    ...record,
    playback: record?.playback ? { ...record.playback } : undefined,
})

const recordTimestamp = (record) => Date.parse(record?.recentAt || record?.lastAccessedAt || record?.importedAt || 0) || 0

export const createBrowserMediaFeatures = ({
    pickFiles = pickFilesWithInput,
    createObjectURL = (file) => URL.createObjectURL(file),
    now = () => new Date().toISOString(),
} = {}) => {
    const records = {
        music: new Map(),
        video: new Map(),
        photo: new Map(),
    }
    const fileByUrl = new Map()
    const urlByFileKey = new Map()
    const listeners = new Map()
    const preferences = {
        music: { volume: 25, playerEffect: 'VinylPlayer', playMode: 'sequential play' },
        video: { volume: 25, playMode: 'sequential' },
        photoPlayCount: 4,
    }

    const list = (type) => [...records[type].values()].map(copyRecord)

    const emit = (channel, payload) => {
        for (const listener of listeners.get(channel) || []) listener(payload)
    }

    const notifyLibraryUpdated = (type) => {
        emit(`${type}-list-updated`, list(type))
        emit('library-updated', { type })
    }

    const fileKey = (file, type) => [
        type,
        file.webkitRelativePath || file.name,
        file.size || 0,
        file.lastModified || 0,
    ].join(':')

    const toRecord = (file, type) => {
        const key = fileKey(file, type)
        let objectUrl = urlByFileKey.get(key)
        if (!objectUrl) {
            objectUrl = createObjectURL(file)
            urlByFileKey.set(key, objectUrl)
            fileByUrl.set(objectUrl, file)
        }
        const title = fileStem(file.name)
        const importedAt = now()
        const base = {
            id: `browser:${key}`,
            type,
            path: objectUrl,
            fileName: file.name,
            title,
            size: Number(file.size) || 0,
            modified: file.lastModified ? new Date(file.lastModified).toISOString() : importedAt,
            importedAt,
            recentAt: importedAt,
            runtime: 'browser',
        }

        if (type === 'music') {
            const match = title.match(/^(.+?)\s+-\s+(.+)$/)
            return {
                ...base,
                artist: match?.[1]?.trim() || '未知艺术家',
                title: match?.[2]?.trim() || title,
            }
        }
        if (type === 'photo') {
            return { ...base, src: objectUrl, thumbnailUrl: objectUrl }
        }
        return base
    }

    const addRecords = (type, incoming = []) => {
        for (const record of incoming) {
            if (!record?.path) continue
            const id = record.id || record.path
            records[type].set(id, {
                ...records[type].get(id),
                ...record,
                id,
                type,
            })
        }
        notifyLibraryUpdated(type)
        return list(type)
    }

    const removeRecord = (type, mediaId) => {
        for (const [id, record] of records[type]) {
            if (id === mediaId || record.path === mediaId) records[type].delete(id)
        }
        notifyLibraryUpdated(type)
        return list(type)
    }

    const findRecord = ({ mediaId, path, type }) => {
        const types = type && records[type] ? [type] : Object.keys(records)
        for (const candidateType of types) {
            for (const record of records[candidateType].values()) {
                if (record.id === mediaId || record.path === mediaId || record.path === path) return record
            }
        }
        return null
    }

    const pickMedia = async (type, options = {}) => {
        const definition = MEDIA_DEFINITIONS[type]
        const selected = await pickFiles({
            type,
            accept: definition.accept,
            directory: Boolean(options.directory),
            multiple: options.multiple !== false,
        })
        return selected
            .filter((file) => definition.extensions.has(fileExtension(file.name)))
            .map((file) => toRecord(file, type))
    }

    const importFolder = async (type) => {
        const selected = await pickMedia(type, { directory: true })
        if (!selected.length) return { status: 'canceled', count: 0 }
        addRecords(type, selected)
        return { status: 'imported', count: selected.length }
    }

    const getInfoFromUrls = (type, urls = []) => urls.map((url) => {
        const existing = [...records[type].values()].find((record) => record.path === url)
        if (existing) return copyRecord(existing)
        const file = fileByUrl.get(url)
        return file ? toRecord(file, type) : null
    }).filter(Boolean)

    const sortedRecords = () => Object.values(records)
        .flatMap((collection) => [...collection.values()])
        .sort((left, right) => recordTimestamp(right) - recordTimestamp(left))

    const getHomeSummary = ({ limitPerSection = 12 } = {}) => {
        const limit = Math.max(1, Math.min(Number(limitPerSection) || 12, 30))
        const recentItems = sortedRecords()
        const recentAdded = [...recentItems].sort((left, right) => (
            (Date.parse(right.importedAt || 0) || 0) - (Date.parse(left.importedAt || 0) || 0)
        ))
        const continueItems = recentItems.filter((record) => (
            Number(record.playback?.positionMs) > 0 && !record.playback?.completed
        ))
        return {
            counts: {
                music: records.music.size,
                video: records.video.size,
                photo: records.photo.size,
            },
            nowPlaying: null,
            continueItems: continueItems.slice(0, limit).map(copyRecord),
            recentItems: recentItems.slice(0, limit).map(copyRecord),
            recentAdded: recentAdded.slice(0, limit).map(copyRecord),
            libraries: {
                music: list('music').slice(0, limit),
                video: list('video').slice(0, limit),
                photo: list('photo').slice(0, limit),
            },
        }
    }

    const downloadRaster = ({ sourcePath, mode, format, raster }) => {
        if (mode === 'overwrite') {
            return {
                status: 'error',
                code: 'BROWSER_OVERWRITE_UNAVAILABLE',
                message: '浏览器预览无法安全覆盖原文件，请在 Utaha Player 桌面应用中使用覆盖保存。',
            }
        }
        const sourceFile = fileByUrl.get(sourcePath)
        const extension = format === 'jpeg' ? 'jpg' : 'png'
        const baseName = fileStem(sourceFile?.name || 'image')
        const outputName = `${baseName}-edited.${extension}`
        const blob = new Blob([raster], { type: format === 'jpeg' ? 'image/jpeg' : 'image/png' })
        const outputUrl = createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = outputUrl
        anchor.download = outputName
        anchor.click()
        const image = {
            id: `browser:photo:${outputName}:${now()}`,
            type: 'photo',
            path: outputUrl,
            src: outputUrl,
            thumbnailUrl: outputUrl,
            fileName: outputName,
            title: fileStem(outputName),
            importedAt: now(),
            recentAt: now(),
            runtime: 'browser',
        }
        addRecords('photo', [image])
        return { status: 'saved', mode: 'copy', outputPath: outputName, image }
    }

    return {
        runtime: 'browser',
        getHomeSummary: async (options) => getHomeSummary(options),
        searchLibrary: async ({ query = '', types = ['music', 'video', 'photo'], limit = 30 } = {}) => {
            const normalizedQuery = query.trim().toLocaleLowerCase()
            return sortedRecords()
                .filter((record) => types.includes(record.type))
                .filter((record) => [record.title, record.artist, record.path]
                    .some((value) => String(value || '').toLocaleLowerCase().includes(normalizedQuery)))
                .slice(0, Math.max(1, Math.min(Number(limit) || 30, 100)))
                .map(copyRecord)
        },
        importMusicFolder: () => importFolder('music'),
        importVideoFolder: () => importFolder('video'),
        importPhotoFolder: () => importFolder('photo'),
        selectAudioFiles: async () => (await pickMedia('music')).map((record) => record.path),
        getAudioInfo: async (urls) => getInfoFromUrls('music', urls),
        addMusicToLibrary: async (items) => addRecords('music', items),
        removeMusicFromLibrary: async (mediaId) => removeRecord('music', mediaId),
        getMusicList: async () => list('music'),
        selectVideoFiles: async () => (await pickMedia('video')).map((record) => record.path),
        getVideoInfo: async (urls) => getInfoFromUrls('video', urls),
        addVideoToLibrary: async (items) => addRecords('video', items),
        removeVideoFromLibrary: async (mediaId) => removeRecord('video', mediaId),
        getVideoList: async () => list('video'),
        getImages: async (mode = 'file') => {
            const selected = await pickMedia('photo', { directory: mode === 'directory' })
            if (selected.length) addRecords('photo', selected)
            return selected
        },
        getImageListShowConfig: async () => ({
            photoPlayCount: preferences.photoPlayCount,
            slideImagesCache: list('photo'),
        }),
        updateSlideShowConfig: async (imageList, photoPlayCount) => {
            if (Number.isInteger(Number(photoPlayCount))) {
                preferences.photoPlayCount = Math.max(1, Math.min(Number(photoPlayCount), 12))
            }
            if (Array.isArray(imageList)) {
                records.photo.clear()
                addRecords('photo', imageList)
            }
            return { status: 'updated' }
        },
        getRecentActivity: async ({ limit = 60 } = {}) => sortedRecords().slice(0, limit).map(copyRecord),
        getFavorites: async ({ limit = 60 } = {}) => sortedRecords()
            .filter((record) => record.favorite)
            .slice(0, limit)
            .map(copyRecord),
        recordMediaActivity: async (payload) => {
            const record = findRecord(payload || {})
            if (record) record.recentAt = now()
        },
        updatePlaybackProgress: async (payload = {}) => {
            const record = findRecord(payload)
            if (!record) return
            const positionMs = Math.max(0, Number(payload.positionMs) || 0)
            const durationMs = Math.max(0, Number(payload.durationMs) || 0)
            record.playback = {
                positionMs,
                durationMs,
                completed: durationMs > 0 && (positionMs / durationMs >= 0.9 || durationMs - positionMs < 30_000),
            }
            record.recentAt = now()
        },
        setFavorite: async (payload = {}) => {
            const record = findRecord(payload)
            if (record) record.favorite = Boolean(payload.favorite)
            return record ? copyRecord(record) : null
        },
        getUserConfig: async (section) => section === 'music'
            ? { ...preferences.music, musicLibrary: { musicList: list('music') } }
            : { ...preferences.video, videoLibrary: { videoList: list('video') } },
        setMusicVolume: async (value) => { preferences.music.volume = Number(value) || 0 },
        setMusicPlayerEffect: async (value) => { preferences.music.playerEffect = value },
        setMusicPlaybackMode: async (value) => { preferences.music.playMode = value },
        setVideoVolume: async (value) => { preferences.video.volume = Number(value) || 0 },
        setVideoPlaybackMode: async (value) => { preferences.video.playMode = value },
        onMessage: (channel, callback) => {
            if (!listeners.has(channel)) listeners.set(channel, new Set())
            listeners.get(channel).add(callback)
            return () => listeners.get(channel)?.delete(callback)
        },
        getBaseName: (value = '') => fileByUrl.get(value)?.name || String(value).split(/[\\/]/).pop() || '',
        checkFileExists: async (value) => fileByUrl.has(value) || String(value).startsWith('blob:'),
        loadLyrics: async () => ({ lyricPath: '', lyricData: [] }),
        selectLyricsFile: async () => ({ lyricPath: '', lyricData: [] }),
        saveLyricsAssociation: async () => ({ success: false }),
        openSlideShow: async () => ({ status: 'browser-preview' }),
        closeSlideShow: async () => ({ status: 'closed' }),
        deleteImageFile: async () => ({
            success: false,
            message: '浏览器预览无法删除本地文件，请在桌面应用中执行。',
        }),
        saveEditedImage: async (payload) => downloadRaster(payload),
    }
}

export const installBrowserMediaFeatures = () => {
    if (typeof window === 'undefined') return undefined
    if (window.electronFeatures) return window.electronFeatures
    const features = createBrowserMediaFeatures()
    window.electronFeatures = features
    return features
}
