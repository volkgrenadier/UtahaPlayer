import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AudiotrackRoundedIcon from '@mui/icons-material/AudiotrackRounded'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import MovieRoundedIcon from '@mui/icons-material/MovieRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { toFileUrl } from '../../utils/mediaUrl'
import './ActivityPage.scss'

const safeArray = (value) => Array.isArray(value) ? value : []
const mediaType = (item) => item?.type || item?.mediaType || (item?.src ? 'photo' : 'music')
const mediaPath = (item) => item?.path || item?.src || item?.filename || ''
const mediaTitle = (item) => item?.title || item?.name || mediaPath(item).split(/[\\/]/).pop() || '未命名媒体'
const mediaSubtitle = (item) => item?.subtitle || item?.artist || item?.album || ({
    music: '本地音乐',
    video: '本地视频',
    photo: '本地图片'
}[mediaType(item)] || '本地媒体')
const mediaRoute = (item) => ({ music: '/music', video: '/video', photo: '/photo' }[mediaType(item)] || '/')
const artwork = (item) => toFileUrl(item?.thumbnailUrl || item?.artworkUrl || item?.picture || item?.thumb || (
    mediaType(item) === 'photo' ? mediaPath(item) : ''
))

const relativeTime = (value) => {
    if (!value) return ''
    const timestamp = new Date(value).getTime()
    if (!Number.isFinite(timestamp)) return ''
    const elapsed = Date.now() - timestamp
    if (elapsed < 60_000) return '刚刚'
    if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} 分钟前`
    if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} 小时前`
    if (elapsed < 604_800_000) return `${Math.floor(elapsed / 86_400_000)} 天前`
    return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(timestamp)
}

const TypeArtwork = ({ item }) => {
    const type = mediaType(item)
    const source = artwork(item)
    const Icon = type === 'video' ? MovieRoundedIcon : type === 'photo' ? ImageRoundedIcon : AudiotrackRoundedIcon
    return (
        <span className={`Activity_artwork Activity_artwork_${type}`}>
            {source ? <img src={source} alt="" /> : <Icon aria-hidden="true" />}
            <small>{type === 'music' ? '音乐' : type === 'video' ? '视频' : '图片'}</small>
        </span>
    )
}

const ActivityPage = ({ mode }) => {
    const isFavorites = mode === 'favorites'
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [pendingId, setPendingId] = useState('')

    const loadItems = useCallback(async () => {
        const features = window.electronFeatures
        setLoading(true)
        try {
            let result
            if (isFavorites) {
                result = typeof features?.getFavorites === 'function'
                    ? await features.getFavorites({ limit: 100 })
                    : []
            } else if (typeof features?.getRecentActivity === 'function') {
                result = await features.getRecentActivity({ limit: 100 })
            } else if (typeof features?.getHomeSummary === 'function') {
                result = (await features.getHomeSummary({ limitPerSection: 100 }))?.recentItems
            } else {
                result = []
            }
            setItems(safeArray(result))
            setError('')
        } catch (loadError) {
            setError(loadError?.message || '无法读取媒体活动')
        } finally {
            setLoading(false)
        }
    }, [isFavorites])

    useEffect(() => {
        loadItems()
        const cleanup = window.electronFeatures?.onMessage?.('library-updated', loadItems)
        return () => {
            if (typeof cleanup === 'function') cleanup()
        }
    }, [loadItems])

    const groupedItems = useMemo(() => {
        if (isFavorites) return [{ label: '全部收藏', items }]
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const weekStart = todayStart.getTime() - 6 * 86_400_000
        const groups = [
            { label: '今天', items: [] },
            { label: '最近 7 天', items: [] },
            { label: '更早', items: [] }
        ]
        items.forEach((item) => {
            const value = new Date(item?.lastAccessedAt || item?.updatedAt || item?.importedAt || 0).getTime()
            if (value >= todayStart.getTime()) groups[0].items.push(item)
            else if (value >= weekStart) groups[1].items.push(item)
            else groups[2].items.push(item)
        })
        return groups.filter(group => group.items.length)
    }, [isFavorites, items])

    const toggleFavorite = async (event, item) => {
        event.preventDefault()
        event.stopPropagation()
        if (typeof window.electronFeatures?.setFavorite !== 'function') return
        const key = item?.id || mediaPath(item)
        setPendingId(key)
        try {
            const favorite = !item?.favorite
            const result = await window.electronFeatures.setFavorite({
                mediaId: item?.id,
                path: mediaPath(item),
                type: mediaType(item),
                favorite
            })
            if (result?.status === 'error') throw new Error(result.message || '收藏状态更新失败')
            if (isFavorites && !favorite) {
                setItems(current => current.filter(candidate => (candidate?.id || mediaPath(candidate)) !== key))
            } else {
                setItems(current => current.map(candidate => (
                    (candidate?.id || mediaPath(candidate)) === key ? { ...candidate, favorite } : candidate
                )))
            }
        } catch (favoriteError) {
            setError(favoriteError?.message || '收藏状态更新失败')
        } finally {
            setPendingId('')
        }
    }

    return (
        <main className="Activity_page">
            <div className="Activity_content">
                <header className="Activity_header">
                    <div>
                        <span className="Activity_eyebrow">YOUR LOCAL COLLECTION</span>
                        <h1>{isFavorites ? '收藏' : '最近'}</h1>
                    </div>
                    <button type="button" onClick={loadItems} disabled={loading}>
                        <RefreshRoundedIcon aria-hidden="true" />刷新
                    </button>
                </header>

                {error && <div className="Activity_notice" role="status">{error}</div>}

                {loading ? (
                    <section className="Activity_loading" aria-label="正在加载"><span /><span /><span /><span /></section>
                ) : !items.length ? (
                    <section className="Activity_empty">
                        {isFavorites ? <FavoriteBorderRoundedIcon aria-hidden="true" /> : <ScheduleRoundedIcon aria-hidden="true" />}
                        <h2>{isFavorites ? '还没有收藏内容' : '还没有活动记录'}</h2>
                        <p>{isFavorites ? '在媒体条目中点击收藏后，它们会统一出现在这里。' : '播放音乐或视频、查看或编辑图片后，这里会按时间显示。'}</p>
                        <Link to="/">返回首页</Link>
                    </section>
                ) : groupedItems.map(group => (
                    <section className="Activity_group" key={group.label}>
                        <div className="Activity_groupTitle">
                            <h2>{group.label}</h2><span>{group.items.length} 项</span>
                        </div>
                        <div className="Activity_grid">
                            {group.items.map((item, index) => {
                                const key = item?.id || mediaPath(item) || index
                                return (
                                    <Link
                                        className="Activity_card"
                                        key={key}
                                        to={mediaRoute(item)}
                                        state={{ mediaId: item?.id, mediaPath: mediaPath(item), resume: true }}
                                    >
                                        <TypeArtwork item={item} />
                                        <span className="Activity_meta">
                                            <strong title={mediaTitle(item)}>{mediaTitle(item)}</strong>
                                            <span title={mediaSubtitle(item)}>{mediaSubtitle(item)}</span>
                                            <small>{relativeTime(item?.lastAccessedAt || item?.updatedAt || item?.importedAt)}</small>
                                        </span>
                                        <button
                                            type="button"
                                            className={item?.favorite ? 'is-favorite' : ''}
                                            disabled={pendingId === key}
                                            onClick={(event) => toggleFavorite(event, item)}
                                            aria-label={item?.favorite ? `取消收藏 ${mediaTitle(item)}` : `收藏 ${mediaTitle(item)}`}
                                            title={item?.favorite ? '取消收藏' : '收藏'}
                                        >
                                            {item?.favorite ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                                        </button>
                                    </Link>
                                )
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </main>
    )
}

export default ActivityPage
