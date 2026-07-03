import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import VideocamIcon from '@mui/icons-material/Videocam'
import PhotoIcon from '@mui/icons-material/Photo'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
import MovieCreationIcon from '@mui/icons-material/MovieCreation'
import CollectionsIcon from '@mui/icons-material/Collections'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import './HomeGuide.scss'

const defaultHomeData = {
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

const HomeGuide = () => {
    const navigate = useNavigate()
    const [homeData, setHomeData] = useState(defaultHomeData)

    useEffect(() => {
        let isUnmounted = false

        const loadHomeData = async () => {
            const electronFeatures = typeof window !== 'undefined' ? window.electronFeatures : null

            if (!electronFeatures) {
                setHomeData({
                    ...defaultHomeData,
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

            setHomeData({
                musicList: musicResult.status === 'fulfilled' ? safeArray(musicResult.value) : [],
                videoList: videoResult.status === 'fulfilled' ? safeArray(videoResult.value) : [],
                imageList: safeArray(imageConfig.slideImagesCache),
                photoPlayCount: getPhotoPlayCount(imageConfig.photoPlayCount),
                loading: false,
                apiReady: true,
                loadError: [musicResult, videoResult, imageResult].some(result => result.status === 'rejected')
            })
        }

        loadHomeData().catch(() => {
            if (isUnmounted) return
            setHomeData({
                ...defaultHomeData,
                loading: false,
                loadError: true
            })
        })

        return () => {
            isUnmounted = true
        }
    }, [])

    const stats = useMemo(() => {
        const musicCount = homeData.musicList.length
        const videoCount = homeData.videoList.length
        const imageCount = homeData.imageList.length

        return {
            musicCount,
            videoCount,
            imageCount,
            totalCount: musicCount + videoCount + imageCount,
            photoPlayCount: homeData.photoPlayCount
        }
    }, [homeData])

    const primaryGuide = useMemo(() => {
        if (homeData.loading) {
            return {
                title: '正在读取你的本地内容',
                description: '首页会根据已有音乐、视频和图片给出下一步建议。',
                route: null,
                actionText: '读取中',
                Icon: TipsAndUpdatesIcon
            }
        }

        if (!homeData.apiReady) {
            return {
                title: '请在 Electron 应用中使用完整能力',
                description: '当前没有连接到本地文件能力，只能看到基础引导信息。',
                route: null,
                actionText: '等待本地能力',
                Icon: InfoOutlinedIcon
            }
        }

        if (stats.totalCount === 0) {
            return {
                title: '先把本地内容放进来',
                description: '从音乐、视频或图片任意一条线开始。导入后，首页会把可继续处理的内容放到这里。',
                route: '/music',
                actionText: '从音乐开始',
                Icon: AddCircleOutlineIcon
            }
        }

        if (stats.musicCount > 0) {
            const firstMusic = homeData.musicList[0]
            return {
                title: '继续整理音乐',
                description: `音乐列表已有 ${stats.musicCount} 首，可从「${getMediaTitle(firstMusic, '未命名音乐')}」开始处理播放、歌词或唱片效果。`,
                route: '/music',
                actionText: '进入音乐',
                Icon: QueueMusicIcon
            }
        }

        if (stats.videoCount > 0) {
            const firstVideo = homeData.videoList[0]
            return {
                title: '继续处理视频',
                description: `视频列表已有 ${stats.videoCount} 个，可从「${getMediaTitle(firstVideo, '未命名视频')}」开始检查格式或播放。`,
                route: '/video',
                actionText: '进入视频',
                Icon: MovieCreationIcon
            }
        }

        return {
            title: '继续处理图片',
            description: `图片缓存已有 ${stats.imageCount} 张，幻灯片当前按 ${stats.photoPlayCount} 格显示。`,
            route: '/photo',
            actionText: '进入图片',
            Icon: CollectionsIcon
        }
    }, [homeData, stats])

    const guideCards = useMemo(() => [
        {
            key: 'music',
            route: '/music',
            title: stats.musicCount > 0 ? '管理音乐列表' : '添加音乐',
            description: stats.musicCount > 0
                ? `${stats.musicCount} 首音乐可播放，也可以继续补歌词和封面。`
                : '导入本地音频后，可以播放、查看歌词和切换播放效果。',
            Icon: MusicNoteIcon,
            actionText: stats.musicCount > 0 ? '去音乐页' : '添加音乐'
        },
        {
            key: 'video',
            route: '/video',
            title: stats.videoCount > 0 ? '检查视频列表' : '添加视频',
            description: stats.videoCount > 0
                ? `${stats.videoCount} 个视频在列表中，进入后可播放或处理格式兼容。`
                : '导入本地视频后，首页会提醒你列表里可继续处理的内容。',
            Icon: VideocamIcon,
            actionText: stats.videoCount > 0 ? '去视频页' : '添加视频'
        },
        {
            key: 'photo',
            route: '/photo',
            title: stats.imageCount > 0 ? '查看图片缓存' : '打开图片',
            description: stats.imageCount > 0
                ? `${stats.imageCount} 张图片已缓存，幻灯片一次显示 ${stats.photoPlayCount} 格。`
                : '打开图片或文件夹后，可以编辑单张图片，也可以播放幻灯片。',
            Icon: PhotoIcon,
            actionText: stats.imageCount > 0 ? '去图片页' : '打开图片'
        }
    ], [stats])

    const usefulNotes = useMemo(() => {
        const notes = []

        if (homeData.loadError) {
            notes.push({
                key: 'load-error',
                tone: 'warning',
                title: '部分本地列表读取失败',
                detail: '首页已保留可用内容，进入对应页面后可以重新触发读取。'
            })
        }

        if (!homeData.apiReady) {
            notes.push({
                key: 'api',
                tone: 'warning',
                title: '本地能力未连接',
                detail: '文件选择、媒体读取和播放需要在 Electron 窗口中使用。'
            })
        }

        notes.push({
            key: 'music',
            tone: stats.musicCount > 0 ? 'ready' : 'idle',
            title: stats.musicCount > 0 ? '音乐可以直接播放' : '音乐列表为空',
            detail: stats.musicCount > 0 ? `已读取 ${stats.musicCount} 首音乐。` : '进入音乐页添加本地音频。'
        })

        notes.push({
            key: 'video',
            tone: stats.videoCount > 0 ? 'ready' : 'idle',
            title: stats.videoCount > 0 ? '视频列表可继续处理' : '视频列表为空',
            detail: stats.videoCount > 0 ? `已读取 ${stats.videoCount} 个视频。` : '进入视频页添加本地视频。'
        })

        notes.push({
            key: 'photo',
            tone: stats.imageCount > 0 ? 'ready' : 'idle',
            title: stats.imageCount > 0 ? '图片缓存可用于图墙' : '图片缓存为空',
            detail: stats.imageCount > 0 ? `已缓存 ${stats.imageCount} 张图片，幻灯片 ${stats.photoPlayCount} 格。` : '进入图片页打开图片或文件夹。'
        })

        return notes
    }, [homeData, stats])

    const musicPreviewList = useMemo(() => homeData.musicList.slice(0, 4), [homeData.musicList])
    const videoPreviewList = useMemo(() => homeData.videoList.slice(0, 4), [homeData.videoList])
    const imagePreviewList = useMemo(() => homeData.imageList.slice(0, 6), [homeData.imageList])

    const handleNavigate = (route) => {
        if (!route) return
        navigate(route)
    }

    const renderGuideButton = (route, text) => (
        <button
            className='HomeGuide_actionButton'
            type='button'
            disabled={!route}
            onClick={() => handleNavigate(route)}
        >
            <span>{text}</span>
            <ArrowForwardIcon />
        </button>
    )

    const renderEmptyContent = (text, actionText, route) => (
        <div className='HomeGuide_emptyContent'>
            <FolderOpenIcon />
            <span>{text}</span>
            {renderGuideButton(route, actionText)}
        </div>
    )

    const PrimaryIcon = primaryGuide.Icon

    return (
        <div className='HomeGuide_container'>
            <section className='HomeGuide_nextStep'>
                <div className='HomeGuide_nextIcon'>
                    <PrimaryIcon />
                </div>
                <div className='HomeGuide_nextContent'>
                    <span className='HomeGuide_sectionLabel'>下一步</span>
                    <h1>{primaryGuide.title}</h1>
                    <p>{primaryGuide.description}</p>
                </div>
                {renderGuideButton(primaryGuide.route, primaryGuide.actionText)}
            </section>

            <div className='HomeGuide_layout'>
                <main className='HomeGuide_main'>
                    <section className='HomeGuide_panel HomeGuide_guidePanel'>
                        <div className='HomeGuide_panelHeader'>
                            <div>
                                <span className='HomeGuide_sectionLabel'>开始操作</span>
                                <h2>你现在可以做这些事</h2>
                            </div>
                        </div>
                        <div className='HomeGuide_guideList'>
                            {
                                guideCards.map((card) => {
                                    const Icon = card.Icon
                                    return (
                                        <button
                                            className={`HomeGuide_guideCard HomeGuide_guideCard_${card.key}`}
                                            key={card.key}
                                            type='button'
                                            onClick={() => handleNavigate(card.route)}
                                        >
                                            <span className='HomeGuide_guideIcon'>
                                                <Icon />
                                            </span>
                                            <span className='HomeGuide_guideInfo'>
                                                <strong>{card.title}</strong>
                                                <em>{card.description}</em>
                                            </span>
                                            <span className='HomeGuide_guideAction'>
                                                {card.actionText}
                                                <ArrowForwardIcon />
                                            </span>
                                        </button>
                                    )
                                })
                            }
                        </div>
                    </section>

                    <section className='HomeGuide_panel HomeGuide_continuePanel'>
                        <div className='HomeGuide_panelHeader'>
                            <div>
                                <span className='HomeGuide_sectionLabel'>已有内容</span>
                                <h2>可继续处理</h2>
                            </div>
                            <span className='HomeGuide_panelHint'>只展示真实读取到的列表内容</span>
                        </div>

                        <div className='HomeGuide_continueGrid'>
                            <div className='HomeGuide_continueColumn'>
                                <button className='HomeGuide_columnTitle' type='button' onClick={() => handleNavigate('/music')}>
                                    <MusicNoteIcon />
                                    <span>音乐</span>
                                </button>
                                {
                                    musicPreviewList.length > 0 ? (
                                        <div className='HomeGuide_itemList'>
                                            {
                                                musicPreviewList.map((music, index) => (
                                                    <div className='HomeGuide_mediaItem' key={music?.path || music?.id || index}>
                                                        <div className='HomeGuide_itemCover HomeGuide_itemCover_music'>
                                                            {
                                                                music?.coverUrl
                                                                    ? <img src={music.coverUrl} alt={getMediaTitle(music, '音乐封面')} />
                                                                    : <MusicNoteIcon />
                                                            }
                                                        </div>
                                                        <div className='HomeGuide_itemInfo'>
                                                            <strong>{getMediaTitle(music, '未命名音乐')}</strong>
                                                            <span>{music?.artist || '未知艺术家'}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    ) : renderEmptyContent('还没有音乐。', '去添加', '/music')
                                }
                            </div>

                            <div className='HomeGuide_continueColumn'>
                                <button className='HomeGuide_columnTitle' type='button' onClick={() => handleNavigate('/video')}>
                                    <VideocamIcon />
                                    <span>视频</span>
                                </button>
                                {
                                    videoPreviewList.length > 0 ? (
                                        <div className='HomeGuide_itemList'>
                                            {
                                                videoPreviewList.map((video, index) => (
                                                    <div className='HomeGuide_mediaItem' key={video?.path || video?.id || index}>
                                                        <div className='HomeGuide_itemCover HomeGuide_itemCover_video'>
                                                            <MovieCreationIcon />
                                                        </div>
                                                        <div className='HomeGuide_itemInfo'>
                                                            <strong>{getMediaTitle(video, '未命名视频')}</strong>
                                                            <span>{video?.codec || video?.format || getFileName(video?.path) || '本地视频'}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    ) : renderEmptyContent('还没有视频。', '去添加', '/video')
                                }
                            </div>

                            <div className='HomeGuide_continueColumn'>
                                <button className='HomeGuide_columnTitle' type='button' onClick={() => handleNavigate('/photo')}>
                                    <PhotoIcon />
                                    <span>图片</span>
                                </button>
                                {
                                    imagePreviewList.length > 0 ? (
                                        <div className='HomeGuide_imageGrid'>
                                            {
                                                imagePreviewList.map((image, index) => {
                                                    const imageSrc = getImageSource(image)
                                                    return (
                                                        <div className='HomeGuide_imageItem' key={imageSrc || index}>
                                                            {
                                                                imageSrc
                                                                    ? <img src={imageSrc} alt={getMediaTitle(image, `图片 ${index + 1}`)} loading='lazy' />
                                                                    : <PhotoIcon />
                                                            }
                                                        </div>
                                                    )
                                                })
                                            }
                                        </div>
                                    ) : renderEmptyContent('还没有图片。', '去打开', '/photo')
                                }
                            </div>
                        </div>
                    </section>
                </main>

                <aside className='HomeGuide_aside'>
                    <section className='HomeGuide_panel HomeGuide_infoPanel'>
                        <div className='HomeGuide_panelHeader'>
                            <div>
                                <span className='HomeGuide_sectionLabel'>有用信息</span>
                                <h2>当前状态</h2>
                            </div>
                        </div>
                        <div className='HomeGuide_noteList'>
                            {
                                usefulNotes.map((note) => (
                                    <div className={`HomeGuide_noteItem HomeGuide_noteItem_${note.tone}`} key={note.key}>
                                        <CheckCircleOutlineIcon />
                                        <div>
                                            <strong>{note.title}</strong>
                                            <span>{note.detail}</span>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </section>

                    <section className='HomeGuide_panel HomeGuide_shortcutPanel'>
                        <div className='HomeGuide_panelHeader'>
                            <div>
                                <span className='HomeGuide_sectionLabel'>快捷入口</span>
                                <h2>常用动作</h2>
                            </div>
                        </div>
                        <button className='HomeGuide_shortcut' type='button' onClick={() => handleNavigate('/music')}>
                            <QueueMusicIcon />
                            <span>打开音乐列表</span>
                            <ArrowForwardIcon />
                        </button>
                        <button className='HomeGuide_shortcut' type='button' onClick={() => handleNavigate('/video')}>
                            <MovieCreationIcon />
                            <span>打开视频列表</span>
                            <ArrowForwardIcon />
                        </button>
                        <button className='HomeGuide_shortcut' type='button' onClick={() => handleNavigate('/photo')}>
                            <SlideshowIcon />
                            <span>打开图片与幻灯片</span>
                            <ArrowForwardIcon />
                        </button>
                    </section>
                </aside>
            </div>
        </div>
    )
}

export default HomeGuide
