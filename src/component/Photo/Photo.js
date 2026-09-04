import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { unstable_usePrompt as usePrompt, useLocation } from 'react-router-dom'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import BrokenImageOutlinedIcon from '@mui/icons-material/BrokenImageOutlined'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined'
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove'
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay'
import { useNotification } from '../../utils/NotificationProvider.js'
import { toFileUrl } from '../../utils/mediaUrl.js'
import { findRequestedMedia } from '../../utils/mediaSelection.js'
import PhotoEditor from './PhotoEditor/PhotoEditor.js'
import PhotoPreview from './PhotoPreview/PhotoPreview.js'
import './Photo.scss'

const imagePath = (image) => image?.path || image?.sourcePath || image?.src || image?.url || ''
const imagePreview = (image) => toFileUrl(image?.thumbnailUrl || image?.thumb || image?.url || image?.src || image?.path || '')

const comparablePath = (image) => imagePath(image).replace(/\\/g, '/').toLocaleLowerCase()

const imageTitle = (image) => {
    if (image?.title) return image.title
    const path = imagePath(image).split(/[?#]/)[0]
    return decodeURIComponent(path.split(/[\\/]/).pop() || '未命名图片')
}

const normalizeImages = (list = []) => list.map((item) => {
    return typeof item === 'string'
        ? { src: item, path: item, title: imageTitle({ src: item }) }
        : { ...item, title: imageTitle(item) }
})

const mergeImages = (current = [], incoming = []) => {
    const merged = new Map()
    current.forEach((image) => {
        const key = comparablePath(image)
        if (key) merged.set(key, image)
    })
    incoming.forEach((image) => {
        const normalized = typeof image === 'string' ? { src: image, path: image } : image
        const key = comparablePath(normalized)
        if (key) merged.set(key, { ...merged.get(key), ...normalized })
    })
    return normalizeImages([...merged.values()])
}

const Photo = () => {
	const location = useLocation()
	const routeRequestRef = useRef(location.state || {})
    const [selectedImage, setSelectedImage] = useState(null)
    const [workspaceMode, setWorkspaceMode] = useState('preview')
    const [imageList, setImageList] = useState([])
    const [photoPlayCount, setPhotoPlayCount] = useState(4)
    const [activeMenu, setActiveMenu] = useState(null)
    const [contextMenu, setContextMenu] = useState(null)
    const [editorDirty, setEditorDirty] = useState(false)
    const [libraryState, setLibraryState] = useState({ status: 'loading', message: '' })
    const playCountButtonRef = useRef(null)
    const notifyContext = useNotification()

	usePrompt({
		when: editorDirty,
		message: '当前图片有未保存的编辑。离开图片工作区将放弃这些更改，是否继续？'
	})

    const persistImageList = useCallback((list) => {
        window.electronFeatures?.updateSlideShowConfig?.(list, undefined)
    }, [])

    useEffect(() => {
        let active = true
        const loadLibrary = async () => {
            try {
                const cachedConfig = await window.electronFeatures?.getImageListShowConfig?.()
                if (!active) return
                const images = normalizeImages(cachedConfig?.slideImagesCache || [])
                setImageList(images)
				const request = routeRequestRef.current
				const requestedImage = findRequestedMedia(images, request)
				if (requestedImage) {
                    setSelectedImage(requestedImage)
                    setWorkspaceMode('preview')
                }
                setPhotoPlayCount(cachedConfig?.photoPlayCount || 4)
                setLibraryState({ status: 'ready', message: '' })
            } catch (error) {
                if (!active) return
                setImageList([])
                setLibraryState({
                    status: 'error',
                    message: error?.message || '无法读取图片库',
                })
            }
        }
        loadLibrary()
        return () => { active = false }
    }, [])

    const confirmDiscard = useCallback((action) => {
        if (!editorDirty) return true
        return window.confirm(`当前图片有未保存的编辑。${action}将放弃这些更改，是否继续？`)
    }, [editorDirty])

    const addImages = useCallback(async (mode) => {
        try {
            const result = await window.electronFeatures?.getImages?.(mode)
            if (!result?.length) return
            setImageList((current) => {
                const next = mergeImages(current, result)
                persistImageList(next)
                return next
            })
            setLibraryState({ status: 'ready', message: '' })
        } catch (error) {
            notifyContext.notify.error(error?.message || '导入图片失败')
        }
    }, [notifyContext.notify, persistImageList])

    const handleImageClick = useCallback((item) => {
        const alreadySelected = comparablePath(item) === comparablePath(selectedImage)
        if (alreadySelected && workspaceMode === 'preview') return
        if (workspaceMode === 'edit' && !confirmDiscard(alreadySelected ? '返回预览' : '切换图片')) return
        setSelectedImage(item)
        setWorkspaceMode('preview')
        setEditorDirty(false)
        window.electronFeatures?.recordMediaActivity?.({
            mediaId: item.id,
            path: imagePath(item),
            type: 'photo',
        }).catch(() => undefined)
    }, [confirmDiscard, selectedImage, workspaceMode])

    const enterEditor = useCallback(() => {
        if (!selectedImage) return
        setEditorDirty(false)
        setWorkspaceMode('edit')
    }, [selectedImage])

    const returnToPreview = useCallback(() => {
        if (!confirmDiscard('退出编辑')) return
        setEditorDirty(false)
        setWorkspaceMode('preview')
    }, [confirmDiscard])

    const removeImage = useCallback((item) => {
        const removingSelected = comparablePath(item) === comparablePath(selectedImage)
        if (removingSelected && !confirmDiscard('移除图片')) return false
        setImageList((current) => {
            const next = normalizeImages(current.filter((image) => comparablePath(image) !== comparablePath(item)))
            persistImageList(next)
            return next
        })
        if (removingSelected) {
            setSelectedImage(null)
            setWorkspaceMode('preview')
            setEditorDirty(false)
        }
        return true
    }, [confirmDiscard, persistImageList, selectedImage])

    const clearImages = useCallback(() => {
        if (!imageList.length) return
        if (!confirmDiscard('清空图片库')) return
        setImageList([])
        setSelectedImage(null)
        setWorkspaceMode('preview')
        setEditorDirty(false)
        persistImageList([])
    }, [confirmDiscard, imageList.length, persistImageList])

    const openSlideShow = useCallback(() => {
        if (!imageList.length) return
        window.electronFeatures?.openSlideShow?.(imageList, photoPlayCount)
    }, [imageList, photoPlayCount])

    const updatePlayCount = useCallback((count) => {
        setPhotoPlayCount(count)
        window.electronFeatures?.updateSlideShowConfig?.(undefined, count)
        setActiveMenu(null)
    }, [])

    const handleContextMenu = useCallback((event, item) => {
        event.preventDefault()
        event.stopPropagation()
        setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, item })
    }, [])

    const handleContextRemove = useCallback(() => {
        if (!contextMenu) return
        if (removeImage(contextMenu.item)) setContextMenu(null)
    }, [contextMenu, removeImage])

    const handleContextDeleteLocal = useCallback(async () => {
        if (!contextMenu) return
        const target = contextMenu.item
        const targetPath = imagePath(target)
        const removingSelected = comparablePath(target) === comparablePath(selectedImage)
        if (removingSelected && !confirmDiscard('删除本地文件')) return
        if (!window.confirm(`确定要永久删除“${imageTitle(target)}”吗？此操作无法撤销。`)) return

        const next = normalizeImages(imageList.filter((image) => comparablePath(image) !== comparablePath(target)))
        try {
            const result = await window.electronFeatures?.deleteImageFile?.(targetPath, next)
            if (!result?.success) {
                notifyContext.notify.error(result?.message || '图片删除失败')
                return
            }
            setImageList(next)
            if (removingSelected) {
                setSelectedImage(null)
                setWorkspaceMode('preview')
                setEditorDirty(false)
            }
            notifyContext.notify.info(result.message || '图片已删除')
            setContextMenu(null)
        } catch (error) {
            notifyContext.notify.error(error?.message || '图片删除失败')
        }
    }, [confirmDiscard, contextMenu, imageList, notifyContext.notify, selectedImage])

    const handleSaved = useCallback((canonicalImage, details) => {
        const outputPath = details?.outputPath || imagePath(canonicalImage)
        if (!outputPath) return
        const normalized = {
            ...canonicalImage,
            path: canonicalImage?.path || outputPath,
            src: canonicalImage?.src || canonicalImage?.url || outputPath,
            title: imageTitle(canonicalImage || { path: outputPath }),
        }

        setImageList((current) => {
            let next
            if (details?.mode === 'overwrite') {
                const sourceKey = comparablePath({ path: details.sourcePath })
                let replaced = false
                next = current.map((image) => {
                    if (comparablePath(image) !== sourceKey) return image
                    replaced = true
                    return { ...image, ...normalized }
                })
                if (!replaced) next.push(normalized)
                next = normalizeImages(next)
            } else {
                next = mergeImages(current, [normalized])
            }
            persistImageList(next)
            return next
        })

        setEditorDirty(false)
        setSelectedImage({ ...normalized, editorRevision: Date.now() })
        setWorkspaceMode('preview')
        window.electronFeatures?.recordMediaActivity?.({
            mediaId: normalized.id,
            path: imagePath(normalized),
            type: 'photo',
        }).catch(() => undefined)
        notifyContext.notify.info(
            details?.mode === 'overwrite' ? '原图已更新' : '图片副本已加入图库',
        )
    }, [notifyContext.notify, persistImageList])

    const selectedKey = comparablePath(selectedImage)
    const toolbarButtons = useMemo(() => ([
        { label: '添加图片', icon: <AddPhotoAlternateIcon />, onClick: () => addImages('file') },
        { label: '添加文件夹', icon: <FolderOpenIcon />, onClick: () => addImages('directory') },
        { label: '播放幻灯片', icon: <SmartDisplayIcon />, onClick: openSlideShow, disabled: !imageList.length, combo: true },
        { label: '清空图片库', icon: <PlaylistRemoveIcon />, onClick: clearImages, disabled: !imageList.length, danger: true },
    ]), [addImages, clearImages, imageList.length, openSlideShow])

    return (
        <div className="Photo_container">
            <aside className="Photo_libraryPanel">
                <div className="Photo_libraryTitle">
                    <div>
                        <PhotoLibraryOutlinedIcon />
                        <div className="Photo_libraryTitleText">
                            <strong>图片库</strong>
                            <small>本地作品墙</small>
                        </div>
                    </div>
                    <span>{imageList.length}</span>
                </div>

                <div className="Photo_imageListHeader">
                    <div className="Photo_toolbarButtons">
                        {toolbarButtons.map((button) => (
                            <div className={`Photo_buttonGroup ${button.combo ? 'combo' : ''}`} key={button.label}>
                                <Tooltip title={button.label}>
                                    <span>
                                        <button
                                            className={`Photo_button ${button.danger ? 'danger' : ''}`}
                                            type="button"
                                            aria-label={button.label}
                                            onClick={button.onClick}
                                            disabled={button.disabled}
                                        >
                                            {button.icon}
                                        </button>
                                    </span>
                                </Tooltip>
                                {button.combo && (
                                    <div className="Photo_secondaryButtonContainer">
                                        <Tooltip title="每屏图片数量">
                                            <button
                                                ref={playCountButtonRef}
                                                className={`Photo_button Photo_countButton ${activeMenu === 'photoPlayCount' ? 'active' : ''}`}
                                                type="button"
                                                aria-label="每屏图片数量"
                                                aria-expanded={activeMenu === 'photoPlayCount'}
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    setActiveMenu((current) => current === 'photoPlayCount' ? null : 'photoPlayCount')
                                                }}
                                            >
                                                <ArrowDropDownIcon />
                                            </button>
                                        </Tooltip>
                                        <div className={`Photo_playCountMenu ${activeMenu === 'photoPlayCount' ? 'open' : ''}`}>
                                            {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                                                <button
                                                    key={count}
                                                    className={photoPlayCount === count ? 'active' : ''}
                                                    type="button"
                                                    onClick={() => updatePlayCount(count)}
                                                >
                                                    {count}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <span className="Photo_playCountMeta">每屏 {photoPlayCount} 张</span>
                </div>

                <div className="Photo_libraryContent">
                    {libraryState.status === 'loading' && (
                        <div className="Photo_libraryMessage"><span className="Photo_loadingDot" />正在读取图片库…</div>
                    )}
                    {libraryState.status === 'error' && (
                        <div className="Photo_libraryMessage error">
                            <BrokenImageOutlinedIcon />
                            <span>{libraryState.message}</span>
                        </div>
                    )}
                    {libraryState.status === 'ready' && imageList.length === 0 && (
                        <div className="Photo_emptyLibrary">
                            <div className="Photo_emptyIcon"><PhotoLibraryOutlinedIcon /></div>
                            <strong>建立你的本地图片库</strong>
                            <p>图片只会保留在这台设备上，可随时编辑或播放幻灯片。</p>
                            <button type="button" onClick={() => addImages('file')}>
                                <AddPhotoAlternateIcon />添加本地图片
                            </button>
                            <button className="secondary" type="button" onClick={() => addImages('directory')}>
                                <FolderOpenIcon />添加文件夹
                            </button>
                        </div>
                    )}
                    {imageList.length > 0 && (
                        <ImageList className="Photo_imageList" variant="masonry" cols={2} gap={8}>
                            {imageList.map((item) => {
                                const itemKey = comparablePath(item)
                                const title = imageTitle(item)
                                return (
                                    <ImageListItem
                                        className={`Photo_imageListItem ${itemKey === selectedKey ? 'selected' : ''}`}
                                        key={item.id || itemKey}
                                    >
                                        <button
                                            className="Photo_imageCard"
                                            type="button"
                                            aria-label={`预览 ${title}`}
                                            aria-pressed={itemKey === selectedKey}
                                            onClick={() => handleImageClick(item)}
                                            onContextMenu={(event) => handleContextMenu(event, item)}
                                        >
                                            <img src={imagePreview(item)} alt="" loading="lazy" />
                                            <span className="Photo_itemLabel">
                                                <strong>{title}</strong>
                                            </span>
                                        </button>
                                    </ImageListItem>
                                )
                            })}
                        </ImageList>
                    )}
                </div>
            </aside>

            <Menu
                open={Boolean(contextMenu)}
                onClose={() => setContextMenu(null)}
                anchorReference="anchorPosition"
                anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
            >
                <MenuItem onClick={handleContextRemove}>
                    <ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>从图片库移除</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleContextDeleteLocal} sx={{ color: 'error.main' }}>
                    <ListItemIcon sx={{ color: 'error.main' }}><DeleteForeverIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>永久删除本地文件</ListItemText>
                </MenuItem>
            </Menu>

            <main className="Photo_displayArea">
                {workspaceMode === 'edit' ? (
                    <PhotoEditor
                        selectedImage={selectedImage}
                        onDirtyChange={setEditorDirty}
                        onSaved={handleSaved}
                        onExit={returnToPreview}
                    />
                ) : (
                    <PhotoPreview
                        image={selectedImage}
                        onEdit={enterEditor}
                        onPlaySlideshow={openSlideShow}
                    />
                )}
            </main>
        </div>
    )
}

export default Photo
