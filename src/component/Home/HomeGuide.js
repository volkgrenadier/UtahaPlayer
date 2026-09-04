import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import AudiotrackRoundedIcon from '@mui/icons-material/AudiotrackRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import MovieRoundedIcon from '@mui/icons-material/MovieRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { toFileUrl } from '../../utils/mediaUrl'
import './HomeGuide.scss'

const EMPTY_SUMMARY = {
    counts: { music: 0, video: 0, photo: 0 },
    nowPlaying: null,
    continueItems: [],
    recentItems: [],
    recentAdded: [],
    libraries: { music: [], video: [], photo: [] }
}

const LIBRARIES = [
    { type: 'music', title: '音乐', unit: '首', route: '/music', Icon: AudiotrackRoundedIcon },
    { type: 'video', title: '视频', unit: '个', route: '/video', Icon: MovieRoundedIcon },
    { type: 'photo', title: '图片', unit: '张', route: '/photo', Icon: ImageRoundedIcon }
]

const safeArray = (value) => Array.isArray(value) ? value : []

const fileName = (value = '') => String(value).split(/[\\/]/).filter(Boolean).pop() || ''

const itemType = (item) => item?.type || item?.mediaType || (item?.src ? 'photo' : 'music')

const itemPath = (item) => item?.path || item?.src || item?.filename || ''

const itemTitle = (item) => item?.title || item?.name || fileName(itemPath(item)) || '未命名媒体'

const itemSubtitle = (item) => item?.subtitle || item?.artist || item?.album || (
    itemType(item) === 'photo' ? '本地图片' : itemType(item) === 'video' ? '本地视频' : '本地音乐'
)

const artworkSource = (item) => toFileUrl(item?.thumbnailUrl || item?.artworkUrl || item?.picture || item?.thumb || (
    itemType(item) === 'photo' ? itemPath(item) : ''
))

const itemRoute = (item) => ({ music: '/music', video: '/video', photo: '/photo' }[itemType(item)] || '/')

const progressValue = (item) => {
    const position = Number(item?.positionMs ?? item?.position ?? 0)
    const duration = Number(item?.durationMs ?? item?.duration ?? 0)
    return duration > 0 ? Math.max(0, Math.min(100, (position / duration) * 100)) : 0
}

const legacySummary = async (features) => {
    const [musicResult, videoResult, photoResult] = await Promise.allSettled([
        features?.getMusicList?.() ?? [],
        features?.getVideoList?.() ?? [],
        features?.getImageListShowConfig?.() ?? {}
    ])
    const music = musicResult.status === 'fulfilled' ? safeArray(musicResult.value) : []
    const video = videoResult.status === 'fulfilled' ? safeArray(videoResult.value) : []
    const photoConfig = photoResult.status === 'fulfilled' ? photoResult.value : {}
    const photo = safeArray(photoConfig?.slideImagesCache)

    return {
        ...EMPTY_SUMMARY,
        counts: { music: music.length, video: video.length, photo: photo.length },
        recentItems: [...music.slice(0, 4), ...video.slice(0, 4), ...photo.slice(0, 4)],
        libraries: { music: music.slice(0, 8), video: video.slice(0, 8), photo: photo.slice(0, 8) }
    }
}

const MediaArtwork = ({ item, large = false }) => {
    const source = artworkSource(item)
    const type = itemType(item)
    const Icon = type === 'video' ? MovieRoundedIcon : type === 'photo' ? ImageRoundedIcon : AudiotrackRoundedIcon

    return (
        <span className={`Home_artwork Home_artwork_${type}${large ? ' Home_artwork_large' : ''}`}>
            {source ? <img src={source} alt="" /> : <Icon aria-hidden="true" />}
            <span className="Home_typeBadge" aria-label={type}>{type === 'music' ? '音乐' : type === 'video' ? '视频' : '图片'}</span>
        </span>
    )
}

const MediaCard = ({ item, kind = 'standard' }) => (
    <Link
        className={`Home_mediaItem Home_mediaItem_${kind}`}
        to={itemRoute(item)}
        state={{ mediaId: item?.id, mediaPath: itemPath(item), resume: kind === 'continue' }}
    >
        <MediaArtwork item={item} large={kind === 'continue'} />
        <span className="Home_mediaMeta">
            <strong title={itemTitle(item)}>{itemTitle(item)}</strong>
            <span title={itemSubtitle(item)}>{itemSubtitle(item)}</span>
            {kind === 'continue' && (
                <span className="Home_progressTrack" aria-label={`播放进度 ${Math.round(progressValue(item))}%`}>
                    <span style={{ width: `${progressValue(item)}%` }} />
                </span>
            )}
        </span>
        {kind === 'continue' && <PlayArrowRoundedIcon className="Home_resumeIcon" aria-hidden="true" />}
    </Link>
)

const Shelf = ({ title, description, icon, items, kind = 'standard', emptyText }) => {
    if (!items.length) return null
    return (
        <section className="Home_shelf" aria-label={title}>
            <div className="Home_sectionHeader">
                <div>
                    <h2>{icon}{title}</h2>
                    {description && <p>{description}</p>}
                </div>
            </div>
            <div className={`Home_mediaRow Home_mediaRow_${kind}`}>
                {items.map((item, index) => (
                    <MediaCard key={item?.id || itemPath(item) || `${title}-${index}`} item={item} kind={kind} />
                ))}
                {!items.length && <span>{emptyText}</span>}
            </div>
        </section>
    )
}

const HomeGuide = () => {
    const [summary, setSummary] = useState(EMPTY_SUMMARY)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    const [importing, setImporting] = useState('')
    const mountedRef = useRef(true)
    const loadSummary = useCallback(async () => {
        const features = window.electronFeatures
        try {
            const result = typeof features?.getHomeSummary === 'function'
                ? await features.getHomeSummary({ limitPerSection: 12 })
                : await legacySummary(features)
            if (!mountedRef.current) return
            setSummary({
                ...EMPTY_SUMMARY,
                ...result,
                counts: { ...EMPTY_SUMMARY.counts, ...(result?.counts || {}) },
                continueItems: safeArray(result?.continueItems),
                recentItems: safeArray(result?.recentItems),
                recentAdded: safeArray(result?.recentAdded),
                libraries: { ...EMPTY_SUMMARY.libraries, ...(result?.libraries || {}) }
            })
            setLoadError('')
        } catch (error) {
            if (mountedRef.current) setLoadError(error?.message || '媒体库读取失败')
        } finally {
            if (mountedRef.current) setLoading(false)
        }
    }, [])

    useEffect(() => {
        mountedRef.current = true
        loadSummary()
        const features = window.electronFeatures
        const cleanups = ['music-list-updated', 'video-list-updated', 'photo-list-updated', 'library-updated']
            .map(channel => features?.onMessage?.(channel, loadSummary))
            .filter(cleanup => typeof cleanup === 'function')
        return () => {
            mountedRef.current = false
            cleanups.forEach(cleanup => cleanup())
        }
    }, [loadSummary])

    useEffect(() => {
        const query = searchQuery.trim()
        if (query.length < 2 || typeof window.electronFeatures?.searchLibrary !== 'function') {
            setSearchResults([])
            setSearching(false)
            return undefined
        }
        let active = true
        setSearching(true)
        const timer = window.setTimeout(async () => {
            try {
                const results = await window.electronFeatures.searchLibrary({ query, types: ['music', 'video', 'photo'], limit: 30 })
                if (active) setSearchResults(safeArray(results))
            } catch {
                if (active) setSearchResults([])
            } finally {
                if (active) setSearching(false)
            }
        }, 220)
        return () => {
            active = false
            window.clearTimeout(timer)
        }
    }, [searchQuery])

    const handleImport = async (type) => {
        const features = window.electronFeatures
        setImportOpen(false)
        setImporting(type)
        try {
            const importFolder = {
                music: features?.importMusicFolder,
                video: features?.importVideoFolder,
                photo: features?.importPhotoFolder,
            }[type]
            if (typeof importFolder !== 'function') throw new Error('当前运行环境未提供文件夹导入接口')
            await importFolder()
            await loadSummary()
        } catch (error) {
            setLoadError(error?.message || '导入媒体失败')
        } finally {
            setImporting('')
        }
    }

    const totalCount = useMemo(
        () => Number(summary.counts.music || 0) + Number(summary.counts.video || 0) + Number(summary.counts.photo || 0),
        [summary.counts]
    )
    const continueItems = useMemo(
        () => [summary.nowPlaying, ...safeArray(summary.continueItems)].filter(Boolean).filter((item, index, list) => (
            list.findIndex(candidate => (candidate?.id || itemPath(candidate)) === (item?.id || itemPath(item))) === index
        )),
        [summary.continueItems, summary.nowPlaying]
    )

    return (
        <main className="Home_container" aria-busy={loading}>
            <div className="Home_content">
                <header className="Home_hero">
                    <div className="Home_heroCopy">
                        <span className="Home_eyebrow">LOCAL · PRIVATE · YOURS</span>
                        <h1>从这里，继续。</h1>
                        <p>音乐、影像与照片留在设备上，也在同一个空间里自然衔接。</p>
                    </div>
                    <div className="Home_commands">
                        <div className="Home_searchWrap">
                            <SearchRoundedIcon aria-hidden="true" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="搜索标题、艺术家或文件名"
                                aria-label="搜索媒体库"
                            />
                            {(searchQuery.trim().length >= 2 || searching) && (
                                <div className="Home_searchResults" role="listbox">
                                    {searching && <div className="Home_searchState">正在搜索…</div>}
                                    {!searching && searchResults.length === 0 && <div className="Home_searchState">没有找到匹配内容</div>}
                                    {!searching && searchResults.map((item, index) => (
                                        <Link
                                            key={item?.id || itemPath(item) || index}
                                            to={itemRoute(item)}
                                            state={{ mediaId: item?.id, mediaPath: itemPath(item) }}
                                            onClick={() => setSearchQuery('')}
                                        >
                                            <MediaArtwork item={item} />
                                            <span><strong>{itemTitle(item)}</strong><small>{itemSubtitle(item)}</small></span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="Home_importWrap">
                            <button
                                className="Home_importButton"
                                type="button"
                                disabled={Boolean(importing)}
                                onClick={() => setImportOpen(open => !open)}
                                aria-expanded={importOpen}
                            >
                                <AddRoundedIcon aria-hidden="true" />
                                {importing ? '正在导入…' : '导入媒体'}
                                <KeyboardArrowDownRoundedIcon aria-hidden="true" />
                            </button>
                            {importOpen && (
                                <div className="Home_importMenu">
                                    <button type="button" onClick={() => handleImport('music')}><AudiotrackRoundedIcon />添加音乐文件夹</button>
                                    <button type="button" onClick={() => handleImport('video')}><MovieRoundedIcon />添加视频文件夹</button>
                                    <button type="button" onClick={() => handleImport('photo')}><FolderOpenRoundedIcon />添加图片文件夹</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {loadError && <div className="Home_notice" role="status">{loadError}</div>}
                {loading ? (
                    <section className="Home_loading" aria-label="正在读取媒体库">
                        <span /><span /><span />
                    </section>
                ) : totalCount === 0 ? (
                    <section className="Home_empty">
                        <span className="Home_emptyIcon"><FolderOpenRoundedIcon /></span>
                        <h2>从你的本地媒体开始</h2>
                        <p>Utaha Player 不上传文件。添加音乐、视频或图片文件夹后，就可以在这里继续播放和浏览。</p>
                        <button type="button" onClick={() => setImportOpen(true)}><AddRoundedIcon />添加本地媒体</button>
                        <div className="Home_emptyShortcuts">
                            {LIBRARIES.map(({ type, title, Icon }) => (
                                <button key={type} type="button" onClick={() => handleImport(type)}><Icon />添加{title}文件夹</button>
                            ))}
                        </div>
                    </section>
                ) : (
                    <>
                        <Shelf
                            title="继续"
                            description="从离开的地方接着播放"
                            icon={<PlayArrowRoundedIcon aria-hidden="true" />}
                            items={continueItems}
                            kind="continue"
                        />
                        <Shelf
                            title="最近使用"
                            description="最近播放、查看和编辑的本地内容"
                            icon={<ScheduleRoundedIcon aria-hidden="true" />}
                            items={safeArray(summary.recentItems)}
                        />
                        <Shelf title="最近加入" items={safeArray(summary.recentAdded)} />

                        <section className="Home_libraries" aria-label="媒体库入口">
                            <div className="Home_sectionHeader">
                                <div><h2>媒体库</h2><p>按内容类型浏览你的本地收藏</p></div>
                            </div>
                            <div className="Home_libraryGrid">
                                {LIBRARIES.map(({ type, title, unit, route, Icon }) => {
                                    const preview = safeArray(summary.libraries?.[type]).slice(0, 4)
                                    return (
                                        <Link className="Home_libraryCard" key={type} to={route}>
                                            <span className="Home_libraryTop">
                                                <span className={`Home_libraryIcon Home_libraryIcon_${type}`}><Icon /></span>
                                                <span className="Home_libraryCount"><strong>{summary.counts[type] || 0}</strong>{unit}</span>
                                            </span>
                                            <span className="Home_libraryTitle">{title}<ArrowForwardRoundedIcon /></span>
                                            <span className="Home_libraryPreview">
                                                {preview.map((item, index) => <MediaArtwork key={item?.id || itemPath(item) || index} item={item} />)}
                                                {preview.length === 0 && <small>还没有可预览的内容</small>}
                                            </span>
                                        </Link>
                                    )
                                })}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </main>
    )
}

export default HomeGuide
