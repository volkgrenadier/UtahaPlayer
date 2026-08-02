import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import VideocamIcon from '@mui/icons-material/Videocam'
import PhotoIcon from '@mui/icons-material/Photo'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import './HomeGuide.scss'

const createCollectionReadState = (state) => ({
    music: state,
    video: state,
    photo: state
})

const defaultHomeData = {
    musicList: [],
    videoList: [],
    imageList: [],
    photoPlayCount: 4,
    loading: true,
    apiReady: true,
    loadError: false,
    collectionReadState: createCollectionReadState('pending')
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

const callElectronFeature = (feature) => {
    if (typeof feature !== 'function') {
        return Promise.reject(new Error('Electron feature is unavailable'))
    }

    try {
        return Promise.resolve(feature())
    } catch (error) {
        return Promise.reject(error)
    }
}

const getReadState = (featureAvailable, result, isValidResult) => {
    if (!featureAvailable) return 'unavailable'
    return result.status === 'fulfilled' && isValidResult(result.value) ? 'ready' : 'failed'
}

const getCollectionStatus = (readState, count, unit) => {
    if (readState === 'pending') return '正在读取'
    if (readState === 'unavailable') return '当前环境不可访问'
    if (readState === 'failed') return '未完整读取，暂无法确认内容'
    return count > 0 ? `已收录 ${count} ${unit}` : '暂未收录内容'
}

const getCollectionPreviewMessage = (readState) => {
    if (readState === 'unavailable') return '当前环境无法访问此媒体库'
    if (readState === 'failed') return '此媒体库未完整读取，暂无法确认内容'
    return ''
}

const HomeGuide = () => {
    const [homeData, setHomeData] = useState(defaultHomeData)

    useEffect(() => {
        let isUnmounted = false

        const loadHomeData = async () => {
            const electronFeatures = typeof window !== 'undefined' ? window.electronFeatures : null

            if (!electronFeatures) {
                setHomeData({
                    ...defaultHomeData,
                    loading: false,
                    apiReady: false,
                    collectionReadState: createCollectionReadState('unavailable')
                })
                return
            }

            const featureAvailability = {
                music: typeof electronFeatures.getMusicList === 'function',
                video: typeof electronFeatures.getVideoList === 'function',
                photo: typeof electronFeatures.getImageListShowConfig === 'function'
            }

            const [musicResult, videoResult, imageResult] = await Promise.allSettled([
                callElectronFeature(electronFeatures.getMusicList),
                callElectronFeature(electronFeatures.getVideoList),
                callElectronFeature(electronFeatures.getImageListShowConfig)
            ])

            if (isUnmounted) return

            const collectionReadState = {
                music: getReadState(featureAvailability.music, musicResult, Array.isArray),
                video: getReadState(featureAvailability.video, videoResult, Array.isArray),
                photo: getReadState(
                    featureAvailability.photo,
                    imageResult,
                    value => Boolean(value && Array.isArray(value.slideImagesCache))
                )
            }
            const imageConfig = collectionReadState.photo === 'ready' ? imageResult.value : {}

            setHomeData({
                musicList: collectionReadState.music === 'ready' ? safeArray(musicResult.value) : [],
                videoList: collectionReadState.video === 'ready' ? safeArray(videoResult.value) : [],
                imageList: safeArray(imageConfig.slideImagesCache),
                photoPlayCount: getPhotoPlayCount(imageConfig.photoPlayCount),
                loading: false,
                apiReady: true,
                loadError: Object.values(collectionReadState).some(state => state !== 'ready'),
                collectionReadState
            })
        }

        loadHomeData().catch(() => {
            if (isUnmounted) return
            setHomeData({
                ...defaultHomeData,
                loading: false,
                loadError: true,
                collectionReadState: createCollectionReadState('failed')
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
            totalCount: musicCount + videoCount + imageCount
        }
    }, [homeData.imageList.length, homeData.musicList.length, homeData.videoList.length])

    const headerStats = useMemo(() => [
        { key: 'total', label: '总项', value: stats.totalCount, unit: '项' },
        { key: 'music', label: '音乐', value: stats.musicCount, unit: '首' },
        { key: 'video', label: '视频', value: stats.videoCount, unit: '个' },
        { key: 'photo', label: '图片', value: stats.imageCount, unit: '张' }
    ], [stats])

    const collectionDefinitions = useMemo(() => [
        {
            key: 'music',
            route: '/music',
            title: '音乐',
            count: stats.musicCount,
            unit: '首',
            readState: homeData.collectionReadState.music,
            status: getCollectionStatus(homeData.collectionReadState.music, stats.musicCount, '首'),
            actionText: '浏览音乐库',
            emptyText: '音乐库尚未收录内容',
            previewKind: 'music',
            Icon: MusicNoteIcon,
            items: homeData.musicList.slice(0, 3)
        },
        {
            key: 'video',
            route: '/video',
            title: '视频',
            count: stats.videoCount,
            unit: '个',
            readState: homeData.collectionReadState.video,
            status: getCollectionStatus(homeData.collectionReadState.video, stats.videoCount, '个'),
            actionText: '浏览视频库',
            emptyText: '视频库尚未收录内容',
            previewKind: 'video',
            Icon: VideocamIcon,
            items: homeData.videoList.slice(0, 3)
        },
        {
            key: 'photo',
            route: '/photo',
            title: '图片',
            count: stats.imageCount,
            unit: '张',
            readState: homeData.collectionReadState.photo,
            status: getCollectionStatus(homeData.collectionReadState.photo, stats.imageCount, '张'),
            actionText: '浏览图片库',
            emptyText: '图片库尚未收录内容',
            previewKind: 'photo',
            Icon: PhotoIcon,
            items: homeData.imageList.slice(0, 4)
        }
    ], [homeData.collectionReadState, homeData.imageList, homeData.musicList, homeData.videoList, stats])

    const homeNotice = useMemo(() => {
        if (homeData.loading) {
            return '正在读取本地媒体库。'
        }

        if (!homeData.apiReady) {
            return '当前预览无法访问本地媒体库，数值以 0 显示。'
        }

        if (homeData.loadError) {
            return '部分媒体内容未读取，已保留可用的媒体库信息。'
        }

        return ''
    }, [homeData.apiReady, homeData.loadError, homeData.loading])

    const headerDescription = useMemo(() => {
        if (homeData.loading) {
            return '正在汇总本地媒体库。'
        }

        if (!homeData.apiReady) {
            return '请在 Utaha Player 桌面应用中查看本地媒体库。'
        }

        if (homeData.loadError && stats.totalCount === 0) {
            return '暂未能完整读取本地媒体库，请稍后重试。'
        }

        if (stats.totalCount === 0) {
            return '当前媒体库还没有收录内容。'
        }

        return `当前收录 ${stats.totalCount} 项本地媒体。`
    }, [homeData.apiReady, homeData.loadError, homeData.loading, stats.totalCount])

    const libraryState = useMemo(() => {
        if (homeData.loading || stats.totalCount > 0) {
            return null
        }

        if (!homeData.apiReady) {
            return {
                key: 'api-unavailable',
                title: '本地媒体库暂不可访问',
                description: '请在 Utaha Player 桌面应用中查看和管理本地内容。'
            }
        }

        if (homeData.loadError) {
            return {
                key: 'load-incomplete',
                title: '媒体库暂未完整读取',
                description: '部分本地内容未能读取，请稍后重试或进入对应媒体库查看。'
            }
        }

        return {
            key: 'empty',
            title: '媒体库还没有内容',
            description: '选择一个媒体库开始浏览和管理本地内容。'
        }
    }, [homeData.apiReady, homeData.loadError, homeData.loading, stats.totalCount])

    const renderLoadingPreview = () => (
        <div className='HomeGuide_previewLoading'>
            <span className='HomeGuide_loadingLine HomeGuide_loadingLine_wide' />
            <span className='HomeGuide_loadingLine' />
            <span className='HomeGuide_loadingLine HomeGuide_loadingLine_short' />
            <span className='HomeGuide_loadingText'>正在读取内容</span>
        </div>
    )

    const renderCollectionPreview = (collection) => {
        if (homeData.loading) {
            return renderLoadingPreview()
        }

        const readStateMessage = getCollectionPreviewMessage(collection.readState)

        if (readStateMessage) {
            return (
                <div className='HomeGuide_cardEmpty HomeGuide_cardEmpty_unavailable'>
                    <InfoOutlinedIcon aria-hidden='true' />
                    <span>{readStateMessage}</span>
                </div>
            )
        }

        if (collection.items.length === 0) {
            return (
                <div className='HomeGuide_cardEmpty'>
                    <FolderOpenIcon aria-hidden='true' />
                    <span>{collection.emptyText}</span>
                </div>
            )
        }

        if (collection.previewKind === 'photo') {
            return (
                <div className='HomeGuide_imagePreviewGrid'>
                    {
                        collection.items.map((image, index) => {
                            const imageSrc = getImageSource(image)
                            const imageTitle = getMediaTitle(image, `图片 ${index + 1}`)

                            return (
                                <div className='HomeGuide_imagePreviewItem' key={imageSrc || image?.id || index}>
                                    {
                                        imageSrc
                                            ? <img src={imageSrc} alt={imageTitle} loading='lazy' />
                                            : <ImageOutlinedIcon aria-hidden='true' />
                                    }
                                </div>
                            )
                        })
                    }
                </div>
            )
        }

        return (
            <div className='HomeGuide_previewList'>
                {
                    collection.items.map((item, index) => {
                        const title = getMediaTitle(item, collection.previewKind === 'music' ? '未命名音乐' : '未命名视频')
                        const isMusic = collection.previewKind === 'music'
                        const meta = isMusic
                            ? item?.artist || '本地音乐'
                            : item?.codec || item?.format || getFileName(item?.path) || '本地视频'

                        return (
                            <div className='HomeGuide_previewItem' key={item?.path || item?.id || index}>
                                <div className={`HomeGuide_previewCover HomeGuide_previewCover_${collection.previewKind}`}>
                                    {
                                        isMusic && item?.coverUrl
                                            ? <img src={item.coverUrl} alt={`${title} 的封面`} />
                                            : isMusic
                                                ? <MusicNoteIcon aria-hidden='true' />
                                                : <VideocamIcon aria-hidden='true' />
                                    }
                                </div>
                                <div className='HomeGuide_previewText'>
                                    <strong title={title}>{title}</strong>
                                    <span title={meta}>{meta}</span>
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        )
    }

    const renderCollectionCard = (collection) => {
        const Icon = collection.Icon

        return (
            <Link
                className={`HomeGuide_collectionCard HomeGuide_collectionCard_${collection.key}`}
                key={collection.key}
                to={collection.route}
                aria-label={`${collection.actionText}，${collection.status}`}
            >
                <span className='HomeGuide_cardTop'>
                    <span className='HomeGuide_cardIcon'>
                        <Icon aria-hidden='true' />
                    </span>
                    <span className='HomeGuide_cardCount'>
                        <strong>{collection.count}</strong>
                        <em>{collection.unit}</em>
                    </span>
                </span>
                <span className='HomeGuide_cardHeading'>
                    <span className='HomeGuide_cardTitle'>{collection.title}</span>
                    <span className='HomeGuide_cardStatus'>{collection.status}</span>
                </span>
                <div className='HomeGuide_cardPreview'>
                    {renderCollectionPreview(collection)}
                </div>
                <span className='HomeGuide_cardAction'>
                    {collection.actionText}
                    <ArrowForwardIcon aria-hidden='true' />
                </span>
            </Link>
        )
    }

    return (
        <main className='HomeGuide_container' aria-busy={homeData.loading}>
            <div className='HomeGuide_content'>
                <header className='HomeGuide_header'>
                    <div className='HomeGuide_headerCopy'>
                        <h1>媒体库</h1>
                        <p>{headerDescription}</p>
                    </div>
                    <dl className='HomeGuide_headerStats' aria-label='媒体库统计'>
                        {
                            headerStats.map((stat) => (
                                <div className='HomeGuide_headerStat' key={stat.key}>
                                    <dt>{stat.label}</dt>
                                    <dd>
                                        <strong>{stat.value}</strong>
                                        <span>{stat.unit}</span>
                                    </dd>
                                </div>
                            ))
                        }
                    </dl>
                </header>

                {
                    homeNotice && (
                        <div className='HomeGuide_notice' role='status' aria-live='polite'>
                            <InfoOutlinedIcon aria-hidden='true' />
                            <span>{homeNotice}</span>
                        </div>
                    )
                }

                {
                    libraryState ? (
                        <section
                            className={`HomeGuide_emptyLibrary HomeGuide_emptyLibrary_${libraryState.key}`}
                            aria-labelledby='HomeGuide_emptyTitle'
                            aria-live='polite'
                        >
                            <div className='HomeGuide_emptyLibraryIcon'>
                                <FolderOpenIcon aria-hidden='true' />
                            </div>
                            <h2 id='HomeGuide_emptyTitle'>{libraryState.title}</h2>
                            <p>{libraryState.description}</p>
                            <div className='HomeGuide_emptyActions'>
                                {
                                    collectionDefinitions.map((collection) => {
                                        const Icon = collection.Icon

                                        return (
                                            <Link
                                                className={`HomeGuide_emptyAction HomeGuide_emptyAction_${collection.key}`}
                                                key={collection.key}
                                                to={collection.route}
                                            >
                                                <Icon aria-hidden='true' />
                                                <span>{collection.actionText}</span>
                                                <ArrowForwardIcon aria-hidden='true' />
                                            </Link>
                                        )
                                    })
                                }
                            </div>
                        </section>
                    ) : (
                        <section className='HomeGuide_collectionGrid' aria-label='媒体库分类'>
                            {collectionDefinitions.map(renderCollectionCard)}
                        </section>
                    )
                }
            </div>
        </main>
    )
}

export default HomeGuide
