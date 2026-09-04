import React, { useEffect, useMemo, useState } from 'react'
import BrokenImageOutlinedIcon from '@mui/icons-material/BrokenImageOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined'
import { toFileUrl } from '../../../utils/mediaUrl'
import './PhotoPreview.scss'

const getPath = (image) => image?.path || image?.sourcePath || image?.src || image?.url || ''

const getTitle = (image) => {
    if (image?.title) return image.title
    const cleanPath = getPath(image).split(/[?#]/)[0]
    return decodeURIComponent(cleanPath.split(/[\\/]/).pop() || '未命名图片')
}

const getExtension = (filePath) => {
    const fileName = filePath.split(/[\\/]/).pop() || ''
    const extension = fileName.includes('.') ? fileName.split('.').pop() : ''
    return extension ? extension.toLocaleUpperCase() : '图片'
}

const formatBytes = (bytes) => {
    const size = Number(bytes)
    if (!Number.isFinite(size) || size <= 0) return ''
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
    return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

const PhotoPreview = ({ image, onEdit, onPlaySlideshow }) => {
    const [loadState, setLoadState] = useState('loading')
    const filePath = getPath(image)
    const source = toFileUrl(image?.url || image?.src || image?.path || image?.sourcePath || '')
    const title = getTitle(image)

    useEffect(() => {
        setLoadState(source ? 'loading' : 'error')
    }, [source])

    const details = useMemo(() => {
        if (!image) return []
        const dimensions = Number(image.width) > 0 && Number(image.height) > 0
            ? `${Math.round(image.width)} × ${Math.round(image.height)}`
            : ''
        return [getExtension(filePath), dimensions, formatBytes(image.size)].filter(Boolean)
    }, [filePath, image])

    if (!image) {
        return (
            <section className="PhotoPreview_empty" aria-label="图片预览">
                <div className="PhotoPreview_emptyMark"><ImageOutlinedIcon /></div>
                <span>PREVIEW</span>
                <h2>选择一张图片开始浏览</h2>
            </section>
        )
    }

    return (
        <section className="PhotoPreview_container" aria-label={`${title} 图片预览`}>
            <header className="PhotoPreview_header">
                <div className="PhotoPreview_heading">
                    <span>图片预览</span>
                    <h2 title={title}>{title}</h2>
                    {details.length > 0 && <p>{details.join('  ·  ')}</p>}
                </div>
                <div className="PhotoPreview_actions">
                    <button className="PhotoPreview_secondaryAction" type="button" onClick={onPlaySlideshow}>
                        <SlideshowOutlinedIcon />
                        幻灯片
                    </button>
                    <button className="PhotoPreview_primaryAction" type="button" onClick={onEdit}>
                        <EditOutlinedIcon />
                        编辑图片
                    </button>
                </div>
            </header>

            <div className={`PhotoPreview_stage is-${loadState}`}>
                <img className="PhotoPreview_ambient" src={source} alt="" aria-hidden="true" />
                <div className="PhotoPreview_backdrop" aria-hidden="true" />
                {loadState === 'loading' && (
                    <div className="PhotoPreview_loading" role="status">
                        <span />
                        正在载入原图…
                    </div>
                )}
                {loadState === 'error' && (
                    <div className="PhotoPreview_error" role="alert">
                        <BrokenImageOutlinedIcon />
                        <strong>无法显示这张图片</strong>
                        <span>文件可能已移动，或当前格式不受支持。</span>
                    </div>
                )}
                <img
                    className="PhotoPreview_image"
                    src={source}
                    alt={title}
                    onLoad={() => setLoadState('ready')}
                    onError={() => setLoadState('error')}
                />
            </div>

            <footer className="PhotoPreview_footer">
                <div>
                    <span>本地文件</span>
                    <strong title={filePath}>{filePath}</strong>
                </div>
            </footer>
        </section>
    )
}

export default PhotoPreview
