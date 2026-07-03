import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import VideocamIcon from '@mui/icons-material/Videocam'
import PhotoIcon from '@mui/icons-material/Photo'
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic'
import MovieIcon from '@mui/icons-material/Movie'
import ImageIcon from '@mui/icons-material/Image'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AlbumIcon from '@mui/icons-material/Album'
import SubtitlesIcon from '@mui/icons-material/Subtitles'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import EditIcon from '@mui/icons-material/Edit'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import './Home.scss'

const defaultDashboardData = {
    musicList: [],
    videoList: [],
    imageList: [],
    photoPlayCount: 4,
    loading: true,
    apiReady: true,
    loadError: false
}

const safeArray = (value) => Array.isArray(value) ? value : []

const getFileName = (filePath = '') => {
    const pathString = String(filePath)
    return pathString.split(/[\\/]/).filter(Boolean).pop() || pathString
}

const getMediaTitle = (item, fallback) => {
    if (typeof item === 'string') {
        return getFileName(item) || fallback
    }
    return item?.title || item?.name || getFileName(item?.filename || item?.path || item?.src) || fallback
}

const getImageSource = (item) => {
    if (typeof item === 'string') {
        return item
    }
    return item?.thumb || item?.src || item?.path || ''
}

const getPhotoPlayCount = (value) => {
    const count = Number(value)
    return Number.isFinite(count) && count > 0 ? count : 4
}

const callElectronFeature = (feature, fallback) => {
    if (typeof feature !== 'function') {
        return Promise.resolve(fallback)
    }

    try {
        return Promise.resolve(feature())
    } catch (error) {
        return Promise.reject(error)
    }
}

const Home = () => {
    const navigate = useNavigate()
    const [dashboardData, setDashboardData] = useState(defaultDashboardData)

    useEffect(() => {
        let isUnmounted = false

        const loadDashboardData = async () => {
            const electronFeatures = typeof window !== 'undefined' ? window.electronFeatures : null

            if (!electronFeatures) {
                setDashboardData({
                    ...defaultDashboardData,
                    loading: false,
                    apiReady: false
                })
                return
            }

            const [musicResult, videoResult, imageResult] = await Promise.allSettled([
                callElectronFeature(electronFeatures.getMusicList, []),
                callElectronFeature(electronFeatures.getVideoList, []),
                callElectronFeature(electronFeatures.getImageListShowConfig, {})
            ])

            if (isUnmounted) return

            const imageConfig = imageResult.status === 'fulfilled' && imageResult.value ? imageResult.value : {}

            setDashboardData({
                musicList: musicResult.status === 'fulfilled' ? safeArray(musicResult.value) : [],
                videoList: videoResult.status === 'fulfilled' ? safeArray(videoResult.value) : [],
                imageList: safeArray(imageConfig.slideImagesCache),
                photoPlayCount: getPhotoPlayCount(imageConfig.photoPlayCount),
                loading: false,
                apiReady: true,
                loadError: [musicResult, videoResult, imageResult].some(result => result.status === 'rejected')
            })
        }

        loadDashboardData().catch(() => {
            if (isUnmounted) return
            setDashboardData({
                ...defaultDashboardData,
                loading: false,
                loadError: true
            })
        })

        return () => {
            isUnmounted = true
        }
    }, [])

    const dashboardStats = useMemo(() => {
        const musicCount = dashboardData.musicList.length
        const videoCount = dashboardData.videoList.length
        const imageCount = dashboardData.imageList.length

        return {
            musicCount,
            videoCount,
            imageCount,
            totalCount: musicCount + videoCount + imageCount,
            photoPlayCount: dashboardData.photoPlayCount
        }
    }, [dashboardData])

    const mediaCards = useMemo(() => [
        {
            key: 'music',
            className: 'Home_mediaCard_music',
            route: '/music',
            title: '音乐库',
            count: dashboardStats.musicCount,
            unit: '首',
            status: dashboardStats.musicCount > 0 ? '已就绪' : '待添加',
            Icon: MusicNoteIcon,
            description: '管理本地播放列表，查看歌词并切换沉浸歌词或唱片效果。',
            features: ['播放列表', '歌词关联', '唱片效果'],
            actionText: '进入音乐'
        },
        {
            key: 'video',
            className: 'Home_mediaCard_video',
            route: '/video',
            title: '视频库',
            count: dashboardStats.videoCount,
            unit: '个',
            status: dashboardStats.videoCount > 0 ? '已就绪' : '待添加',
            Icon: VideocamIcon,
            description: '查看本地视频列表，保留格式检测与转码通知状态。',
            features: ['本地播放', '格式检测', '转码通知'],
            actionText: '进入视频'
        },
        {
            key: 'photo',
            className: 'Home_mediaCard_photo',
            route: '/photo',
            title: '图片库',
            count: dashboardStats.imageCount,
            unit: '张',
            status: dashboardStats.imageCount > 0 ? '已缓存' : '待添加',
            Icon: PhotoIcon,
            description: `浏览图片图墙，编辑单张图片，并按 ${dashboardStats.photoPlayCount} 格播放幻灯片。`,
            features: ['图墙浏览', '图片编辑', '幻灯片'],
            actionText: '进入图片'
        }
    ], [dashboardStats])

    const libraryRows = useMemo(() => [
        {
            key: 'total',
            label: '总文件数',
            value: dashboardStats.totalCount,
            unit: '项',
            Icon: LibraryMusicIcon,
            active: dashboardStats.totalCount > 0
        },
        {
            key: 'music',
            label: '音乐数',
            value: dashboardStats.musicCount,
            unit: '首',
            Icon: MusicNoteIcon,
            active: dashboardStats.musicCount > 0
        },
        {
            key: 'video',
            label: '视频数',
            value: dashboardStats.videoCount,
            unit: '个',
            Icon: MovieIcon,
            active: dashboardStats.videoCount > 0
        },
        {
            key: 'image',
            label: '图片缓存数',
            value: dashboardStats.imageCount,
            unit: '张',
            Icon: ImageIcon,
            active: dashboardStats.imageCount > 0
        },
        {
            key: 'slide',
            label: '幻灯片格数',
            value: dashboardStats.photoPlayCount,
            unit: '格',
            Icon: SlideshowIcon,
            active: dashboardStats.photoPlayCount > 0
        }
    ], [dashboardStats])

    const abilityBadges = useMemo(() => [
        { key: 'music-play', label: '音乐播放', Icon: PlayArrowIcon },
        { key: 'music-lyrics', label: '歌词', Icon: SubtitlesIcon },
        { key: 'music-vinyl', label: '唱片效果', Icon: AlbumIcon },
        { key: 'video-play', label: '视频播放', Icon: VideocamIcon },
        { key: 'video-check', label: '格式检测', Icon: MovieIcon },
        { key: 'video-transcode', label: '转码通知', Icon: InfoOutlinedIcon },
        { key: 'photo-wall', label: '图片图墙', Icon: PhotoIcon },
        { key: 'photo-edit', label: '编辑', Icon: EditIcon },
        { key: 'photo-slide', label: '幻灯片', Icon: SlideshowIcon }
    ], [])

    const musicPreviewList = useMemo(() => dashboardData.musicList.slice(0, 3), [dashboardData.musicList])
    const videoPreviewList = useMemo(() => dashboardData.videoList.slice(0, 3), [dashboardData.videoList])
    const imagePreviewList = useMemo(() => dashboardData.imageList.slice(0, 4), [dashboardData.imageList])

    const handleNavigate = (route) => {
        navigate(route)
    }

    const handleCardKeyDown = (event, route) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleNavigate(route)
        }
    }

    const renderEmptyState = (text, actionText, route) => (
        <div className='Home_emptyState'>
            <InfoOutlinedIcon className='Home_emptyIcon' />
            <div className='Home_emptyText'>{text}</div>
            <button
                className='Home_emptyAction'
                type='button'
                onClick={() => handleNavigate(route)}
            >
                {actionText}
            </button>
        </div>
    )

    const homeNotice = dashboardData.loading
        ? '正在读取本地媒体库...'
        : !dashboardData.apiReady
            ? '当前运行环境未连接 Electron API，首页以空状态展示。'
            : dashboardData.loadError
                ? '部分媒体库读取失败，已按空状态继续展示。'
                : ''

    return (
        <div className='Home_container'>
            <section className='Home_header'>
                <div className='Home_headerText'>
                    <div className='Home_overline'>Utaha Player</div>
                    <h1>本地媒体中心</h1>
                    <p>汇总音乐、视频和图片库状态，快速进入对应工作区继续管理内容。</p>
                </div>
                <div className='Home_headerStats'>
                    <div className='Home_headerStat'>
                        <span>音乐</span>
                        <strong>{dashboardStats.musicCount}</strong>
                    </div>
                    <div className='Home_headerStat'>
                        <span>视频</span>
                        <strong>{dashboardStats.videoCount}</strong>
                    </div>
                    <div className='Home_headerStat'>
                        <span>图片</span>
                        <strong>{dashboardStats.imageCount}</strong>
                    </div>
                </div>
            </section>

            {
                homeNotice && (
                    <div className='Home_readNotice'>
                        <InfoOutlinedIcon />
                        <span>{homeNotice}</span>
                    </div>
                )
            }

            <section className='Home_mediaGrid'>
                {
                    mediaCards.map((card) => {
                        const Icon = card.Icon
                        return (
                            <div
                                key={card.key}
                                className={`Home_mediaCard ${card.className}`}
                                role='button'
                                tabIndex={0}
                                aria-label={card.actionText}
                                onClick={() => handleNavigate(card.route)}
                                onKeyDown={(event) => handleCardKeyDown(event, card.route)}
                            >
                                <div className='Home_mediaCardHeader'>
                                    <div className='Home_mediaCardIcon'>
                                        <Icon />
                                    </div>
                                    <span className={`Home_statusPill ${card.count > 0 ? 'Home_statusPill_ready' : ''}`}>
                                        {card.status}
                                    </span>
                                </div>
                                <div className='Home_mediaCardBody'>
                                    <h2>{card.title}</h2>
                                    <div className='Home_mediaCount'>
                                        <strong>{card.count}</strong>
                                        <span>{card.unit}</span>
                                    </div>
                                    <p>{card.description}</p>
                                </div>
                                <div className='Home_mediaFeatureList'>
                                    {
                                        card.features.map(feature => (
                                            <span key={feature}>{feature}</span>
                                        ))
                                    }
                                </div>
                                <span className='Home_mediaAction'>
                                    {card.actionText}
                                    <ArrowForwardIcon />
                                </span>
                            </div>
                        )
                    })
                }
            </section>

            <div className='Home_contentGrid'>
                <div className='Home_mainColumn'>
                    <section className='Home_panel Home_previewPanel'>
                        <div className='Home_panelHeader'>
                            <div>
                                <h2>列表预览</h2>
                                <p>展示当前列表前几项，不代表真实最近播放历史。</p>
                            </div>
                        </div>
                        <div className='Home_previewGrid'>
                            <div className='Home_previewColumn'>
                                <div className='Home_previewColumnTitle'>
                                    <LibraryMusicIcon />
                                    <span>音乐</span>
                                </div>
                                {
                                    musicPreviewList.length > 0 ? (
                                        <div className='Home_previewList'>
                                            {
                                                musicPreviewList.map((music, index) => (
                                                    <div className='Home_previewItem' key={music?.path || music?.id || index}>
                                                        <div className='Home_previewIcon Home_previewIcon_music'>
                                                            {
                                                                music?.coverUrl
                                                                    ? <img src={music.coverUrl} alt={getMediaTitle(music, '音乐封面')} />
                                                                    : <MusicNoteIcon />
                                                            }
                                                        </div>
                                                        <div className='Home_previewInfo'>
                                                            <div className='Home_previewName'>{getMediaTitle(music, '未命名音乐')}</div>
                                                            <div className='Home_previewMeta'>{music?.artist || '未知艺术家'}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    ) : renderEmptyState('音乐列表为空，进入音乐页添加文件。', '进入音乐', '/music')
                                }
                            </div>

                            <div className='Home_previewColumn'>
                                <div className='Home_previewColumnTitle'>
                                    <MovieIcon />
                                    <span>视频</span>
                                </div>
                                {
                                    videoPreviewList.length > 0 ? (
                                        <div className='Home_previewList'>
                                            {
                                                videoPreviewList.map((video, index) => (
                                                    <div className='Home_previewItem' key={video?.path || video?.id || index}>
                                                        <div className='Home_previewIcon Home_previewIcon_video'>
                                                            <VideocamIcon />
                                                        </div>
                                                        <div className='Home_previewInfo'>
                                                            <div className='Home_previewName'>{getMediaTitle(video, '未命名视频')}</div>
                                                            <div className='Home_previewMeta'>{video?.codec || video?.format || getFileName(video?.path) || '本地视频'}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    ) : renderEmptyState('视频列表为空，进入视频页添加文件。', '进入视频', '/video')
                                }
                            </div>

                            <div className='Home_previewColumn'>
                                <div className='Home_previewColumnTitle'>
                                    <PhotoIcon />
                                    <span>图片</span>
                                </div>
                                {
                                    imagePreviewList.length > 0 ? (
                                        <div className='Home_imagePreviewGrid'>
                                            {
                                                imagePreviewList.map((image, index) => {
                                                    const imageSrc = getImageSource(image)
                                                    return (
                                                        <div className='Home_imagePreviewItem' key={imageSrc || index}>
                                                            {
                                                                imageSrc
                                                                    ? <img src={imageSrc} alt={getMediaTitle(image, `图片 ${index + 1}`)} loading='lazy' />
                                                                    : <ImageIcon />
                                                            }
                                                        </div>
                                                    )
                                                })
                                            }
                                        </div>
                                    ) : renderEmptyState('图片缓存为空，进入图片页打开图片或文件夹。', '进入图片', '/photo')
                                }
                            </div>
                        </div>
                    </section>

                    <section className='Home_panel Home_abilityPanel'>
                        <div className='Home_panelHeader'>
                            <div>
                                <h2>当前能力</h2>
                                <p>只展示当前项目已有链路，不伪造收藏或最近播放数据。</p>
                            </div>
                        </div>
                        <div className='Home_abilityBadgeList'>
                            {
                                abilityBadges.map((badge) => {
                                    const Icon = badge.Icon
                                    return (
                                        <span className='Home_abilityBadge' key={badge.key}>
                                            <Icon />
                                            <span>{badge.label}</span>
                                        </span>
                                    )
                                })
                            }
                        </div>
                    </section>
                </div>

                <aside className='Home_sideColumn'>
                    <section className='Home_panel Home_libraryPanel'>
                        <div className='Home_panelHeader'>
                            <div>
                                <h2>媒体库状态</h2>
                                <p>来自本地配置的只读汇总。</p>
                            </div>
                        </div>
                        <div className='Home_statusList'>
                            {
                                libraryRows.map((row) => {
                                    const Icon = row.Icon
                                    return (
                                        <div className='Home_statusRow' key={row.key}>
                                            <div className='Home_statusIcon'>
                                                <Icon />
                                            </div>
                                            <div className='Home_statusInfo'>
                                                <span>{row.label}</span>
                                                <strong>{row.value}<em>{row.unit}</em></strong>
                                            </div>
                                            <div className={`Home_statusDot ${row.active ? 'Home_statusDot_ready' : ''}`} />
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </section>

                    <section className='Home_panel Home_developPanel'>
                        <div className='Home_developTitle'>
                            <InfoOutlinedIcon />
                            <span>开发状态</span>
                        </div>
                        <div className='Home_developList'>
                            <div className='Home_developItem'>
                                <strong>收藏 / 最近播放</strong>
                                <span>当前仍为占位页面，首页不生成虚假数据。</span>
                            </div>
                            <div className='Home_developItem'>
                                <strong>视频格式链路</strong>
                                <span>格式检测和转码通知已保留展示，播放兼容性仍需后续修复。</span>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    )
}

export default Home
