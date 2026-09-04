import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva'
import Tooltip from '@mui/material/Tooltip'
import Slider from '@mui/material/Slider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import BrushIcon from '@mui/icons-material/Brush'
import CompareIcon from '@mui/icons-material/Compare'
import CropIcon from '@mui/icons-material/Crop'
import FlipIcon from '@mui/icons-material/Flip'
import PanToolAltIcon from '@mui/icons-material/PanToolAlt'
import RedoIcon from '@mui/icons-material/Redo'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import SaveIcon from '@mui/icons-material/Save'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import TuneIcon from '@mui/icons-material/Tune'
import UndoIcon from '@mui/icons-material/Undo'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { toFileUrl } from '../../../utils/mediaUrl'
import {
    canvasToArrayBuffer,
    clampCropRect,
    createEditorDocument,
    cropDocument,
    fitDocumentInViewport,
    flipDocument,
    getDisplayName,
    getExportFormat,
    getSourceExtension,
    renderDocument,
    renderDocumentBase,
    rotateDocument,
} from './editorDocument'
import './PhotoEditor.scss'

const SOURCE_LOAD_ERROR = '无法读取这张图片，请确认文件仍然存在且格式受支持。'

const getImageSource = (image) => toFileUrl(image?.url || image?.src || image?.path || image?.sourcePath || '')
const getImagePath = (image) => image?.path || image?.sourcePath || image?.src || ''
const getSourceDimensions = (image) => ({
    width: image?.naturalWidth || image?.width || 1,
    height: image?.naturalHeight || image?.height || 1,
})

const createTimeline = (document = null) => ({ past: [], present: document, future: [] })

const useDocumentHistory = () => {
    const [timeline, setTimeline] = useState(() => createTimeline())

    const reset = useCallback((document) => setTimeline(createTimeline(document)), [])

    const commit = useCallback((updater) => {
        setTimeline((current) => {
            if (!current.present) return current
            const next = typeof updater === 'function' ? updater(current.present) : updater
            if (!next || next === current.present) return current
            return {
                past: [...current.past, current.present],
                present: next,
                future: [],
            }
        })
    }, [])

    const replace = useCallback((updater) => {
        setTimeline((current) => {
            if (!current.present) return current
            const next = typeof updater === 'function' ? updater(current.present) : updater
            return next && next !== current.present ? { ...current, present: next } : current
        })
    }, [])

    const undo = useCallback(() => {
        setTimeline((current) => {
            if (!current.past.length) return current
            const previous = current.past[current.past.length - 1]
            return {
                past: current.past.slice(0, -1),
                present: previous,
                future: [current.present, ...current.future],
            }
        })
    }, [])

    const redo = useCallback(() => {
        setTimeline((current) => {
            if (!current.future.length) return current
            const next = current.future[0]
            return {
                past: [...current.past, current.present],
                present: next,
                future: current.future.slice(1),
            }
        })
    }, [])

    return {
        document: timeline.present,
        canUndo: timeline.past.length > 0,
        canRedo: timeline.future.length > 0,
        reset,
        commit,
        replace,
        undo,
        redo,
    }
}

const ToolButton = ({ active = false, disabled = false, label, children, ...buttonProps }) => (
    <Tooltip title={label} enterDelay={450}>
        <span className="PhotoEditor_toolButtonWrap">
            <button
                {...buttonProps}
                className={`PhotoEditor_toolBtn ${active ? 'active' : ''}`}
                type="button"
                disabled={disabled}
                aria-label={label}
                aria-pressed={active || undefined}
            >
                {children}
            </button>
        </span>
    </Tooltip>
)

const PhotoEditor = ({ selectedImage, onDirtyChange, onSaved, onExit }) => {
    const displayAreaRef = useRef(null)
    const stageRef = useRef(null)
    const cropRectRef = useRef(null)
    const transformerRef = useRef(null)
    const isDrawingRef = useRef(false)
    const activeLineIdRef = useRef(null)

    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
    const [sourceImage, setSourceImage] = useState(null)
    const [savedDocument, setSavedDocument] = useState(null)
    const [loadState, setLoadState] = useState({ status: 'idle', message: '' })
    const [editMode, setEditMode] = useState('pan')
    const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
    const [cropRect, setCropRect] = useState(null)
    const [drawColor, setDrawColor] = useState('#9d2f5c')
    const [drawWidth, setDrawWidth] = useState(6)
    const [compareOriginal, setCompareOriginal] = useState(false)
    const [saveMenuAnchor, setSaveMenuAnchor] = useState(null)
    const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveNotice, setSaveNotice] = useState(null)

    const {
        document,
        canUndo,
        canRedo,
        reset: resetHistory,
        commit,
        replace,
        undo,
        redo,
    } = useDocumentHistory()

    const imageSource = getImageSource(selectedImage)
    const sourcePath = getImagePath(selectedImage)
    const sourceFileName = selectedImage?.fileName || selectedImage?.name || ''
    const sourceDescriptor = sourceFileName || sourcePath
    const sourceExtension = getSourceExtension(sourceDescriptor)
    const isGif = sourceExtension === 'gif'
    const dirty = Boolean(document && savedDocument && document !== savedDocument)

    useEffect(() => {
        onDirtyChange?.(dirty)
    }, [dirty, onDirtyChange])

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!dirty) return
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [dirty])

    useEffect(() => {
        let canceled = false
        setSourceImage(null)
        setSavedDocument(null)
        resetHistory(null)
        setSaveNotice(null)
        setCropRect(null)
        setEditMode('pan')

        if (!imageSource) {
            setLoadState({ status: 'idle', message: '' })
            return () => { canceled = true }
        }

        setLoadState({ status: 'loading', message: '正在读取原始图片…' })
        const image = new window.Image()
        image.decoding = 'async'
        image.onload = () => {
            if (canceled) return
            const dimensions = getSourceDimensions(image)
            const initialDocument = createEditorDocument(dimensions.width, dimensions.height)
            setSourceImage(image)
            resetHistory(initialDocument)
            setSavedDocument(initialDocument)
            setDrawWidth(Math.max(2, Math.round(Math.max(dimensions.width, dimensions.height) / 700)))
            setLoadState({ status: 'ready', message: '' })
        }
        image.onerror = () => {
            if (!canceled) setLoadState({ status: 'error', message: SOURCE_LOAD_ERROR })
        }
        image.src = imageSource

        return () => { canceled = true }
    }, [imageSource, resetHistory])

    useLayoutEffect(() => {
        const element = displayAreaRef.current
        if (!element) return undefined
        const updateSize = () => {
            setContainerSize({
                width: Math.max(1, element.clientWidth),
                height: Math.max(1, element.clientHeight),
            })
        }
        updateSize()
        const observer = new ResizeObserver(updateSize)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    const documentBrightness = document?.brightness
    const documentContrast = document?.contrast
    const documentHeight = document?.height
    const documentMatrix = document?.matrix
    const documentSourceHeight = document?.sourceHeight
    const documentSourceWidth = document?.sourceWidth
    const documentWidth = document?.width
    const previewDocument = useMemo(() => {
        if (!sourceImage || !documentMatrix) return null
        return renderDocumentBase(sourceImage, {
            brightness: documentBrightness,
            contrast: documentContrast,
            height: documentHeight,
            matrix: documentMatrix,
            sourceHeight: documentSourceHeight,
            sourceWidth: documentSourceWidth,
            width: documentWidth,
        }, 2048)
    }, [
        documentBrightness,
        documentContrast,
        documentHeight,
        documentMatrix,
        documentSourceHeight,
        documentSourceWidth,
        documentWidth,
        sourceImage,
    ])

    const originalDocument = useMemo(() => {
        if (!sourceImage) return null
        const dimensions = getSourceDimensions(sourceImage)
        return createEditorDocument(dimensions.width, dimensions.height)
    }, [sourceImage])

    const originalPreview = useMemo(() => {
        if (!sourceImage || !originalDocument) return null
        return renderDocumentBase(sourceImage, originalDocument, 2048)
    }, [originalDocument, sourceImage])

    const visibleDocument = compareOriginal ? originalDocument : document
    const visiblePreview = compareOriginal ? originalPreview : previewDocument
    const visibleWidth = visibleDocument?.width
    const visibleHeight = visibleDocument?.height

    const resetView = useCallback(() => {
        if (!visibleWidth || !visibleHeight) return
        setView(fitDocumentInViewport(
            visibleWidth,
            visibleHeight,
            containerSize.width,
            containerSize.height,
        ))
    }, [containerSize.height, containerSize.width, visibleHeight, visibleWidth])

    useEffect(() => {
        resetView()
    }, [resetView])

    useEffect(() => {
        if (editMode !== 'crop' || !transformerRef.current || !cropRectRef.current) return
        transformerRef.current.nodes([cropRectRef.current])
        transformerRef.current.getLayer()?.batchDraw()
    }, [cropRect, editMode])

    const toDocumentPoint = useCallback(() => {
        const pointer = stageRef.current?.getPointerPosition()
        if (!pointer) return null
        return {
            x: (pointer.x - view.x) / view.scale,
            y: (pointer.y - view.y) / view.scale,
        }
    }, [view])

    const isInsideDocument = useCallback((point) => Boolean(
        point && document
        && point.x >= 0 && point.y >= 0
        && point.x <= document.width && point.y <= document.height
    ), [document])

    const handleWheel = useCallback((event) => {
        event.evt.preventDefault()
        if (!visibleWidth || !visibleHeight) return
        const pointer = stageRef.current?.getPointerPosition()
        if (!pointer) return
        const point = {
            x: (pointer.x - view.x) / view.scale,
            y: (pointer.y - view.y) / view.scale,
        }
        const factor = event.evt.deltaY < 0 ? 1.12 : 1 / 1.12
        const fit = fitDocumentInViewport(
            visibleWidth,
            visibleHeight,
            containerSize.width,
            containerSize.height,
        ).scale
        const nextScale = Math.max(fit * 0.25, Math.min(view.scale * factor, fit * 12))
        setView({
            scale: nextScale,
            x: pointer.x - point.x * nextScale,
            y: pointer.y - point.y * nextScale,
        })
    }, [containerSize.height, containerSize.width, view, visibleHeight, visibleWidth])

    const startDrawing = useCallback(() => {
        if (editMode !== 'draw' || saving) return
        const point = toDocumentPoint()
        if (!isInsideDocument(point)) return
        const line = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            points: [point.x, point.y],
            color: drawColor,
            width: drawWidth,
        }
        activeLineIdRef.current = line.id
        isDrawingRef.current = true
        commit((current) => ({ ...current, lines: [...current.lines, line] }))
    }, [commit, drawColor, drawWidth, editMode, isInsideDocument, saving, toDocumentPoint])

    const continueDrawing = useCallback(() => {
        if (!isDrawingRef.current || editMode !== 'draw') return
        const point = toDocumentPoint()
        if (!point) return
        const clampedPoint = {
            x: Math.max(0, Math.min(point.x, document.width)),
            y: Math.max(0, Math.min(point.y, document.height)),
        }
        replace((current) => ({
            ...current,
            lines: current.lines.map((line) => line.id === activeLineIdRef.current
                ? { ...line, points: [...line.points, clampedPoint.x, clampedPoint.y] }
                : line),
        }))
    }, [document, editMode, replace, toDocumentPoint])

    const stopDrawing = useCallback(() => {
        isDrawingRef.current = false
        activeLineIdRef.current = null
    }, [])

    const addText = useCallback((event) => {
        if (editMode !== 'text' || saving) return
        if (event.target !== event.target.getStage() && event.target.getClassName() !== 'Image') return
        const point = toDocumentPoint()
        if (!isInsideDocument(point)) return
        const value = window.prompt('输入文字', '双击编辑')
        if (value === null || value.trim() === '') return
        const fontSize = Math.max(18, Math.round(Math.min(document.width, document.height) / 24))
        commit((current) => ({
            ...current,
            texts: [...current.texts, {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                x: point.x,
                y: point.y,
                text: value,
                fontSize,
                fill: drawColor,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
            }],
        }))
    }, [commit, document, drawColor, editMode, isInsideDocument, saving, toDocumentPoint])

    const editText = useCallback((text) => {
        const value = window.prompt('编辑文字', text.text)
        if (value === null || value === text.text) return
        if (!value.trim()) {
            commit((current) => ({ ...current, texts: current.texts.filter((item) => item.id !== text.id) }))
            return
        }
        commit((current) => ({
            ...current,
            texts: current.texts.map((item) => item.id === text.id ? { ...item, text: value } : item),
        }))
    }, [commit])

    const activateCrop = useCallback(() => {
        if (!document) return
        const insetX = Math.round(document.width * 0.06)
        const insetY = Math.round(document.height * 0.06)
        setCropRect({
            x: insetX,
            y: insetY,
            width: document.width - insetX * 2,
            height: document.height - insetY * 2,
        })
        setEditMode('crop')
    }, [document])

    const confirmCrop = useCallback(() => {
        if (!cropRect) return
        commit((current) => cropDocument(current, cropRect))
        setCropRect(null)
        setEditMode('pan')
    }, [commit, cropRect])

    const cancelCrop = useCallback(() => {
        setCropRect(null)
        setEditMode('pan')
    }, [])

    const updateCropFromNode = useCallback(() => {
        const node = cropRectRef.current
        if (!node || !document) return
        const nextRect = clampCropRect({
            x: node.x(),
            y: node.y(),
            width: node.width() * node.scaleX(),
            height: node.height() * node.scaleY(),
        }, document.width, document.height)
        node.scale({ x: 1, y: 1 })
        setCropRect(nextRect)
    }, [document])

    const resetEdits = useCallback(() => {
        if (!sourceImage || !document) return
        if (dirty && !window.confirm('重置将放弃当前图片的全部编辑，是否继续？')) return
        const dimensions = getSourceDimensions(sourceImage)
        const initialDocument = createEditorDocument(dimensions.width, dimensions.height)
        commit(initialDocument)
        setCropRect(null)
        setEditMode('pan')
    }, [commit, dirty, document, sourceImage])

    const handleSave = useCallback(async (mode) => {
        if (saving || !document || !sourceImage) return
        setSaveMenuAnchor(null)
        if (!sourcePath) {
            setSaveNotice({ tone: 'error', text: '无法确定原始文件路径，不能保存。' })
            return
        }
        if (isGif && mode === 'overwrite') {
            setSaveNotice({ tone: 'warning', text: 'GIF 不能覆盖保存，请保存为静态 PNG 副本。' })
            return
        }
        if (typeof window.electronFeatures?.saveEditedImage !== 'function') {
            setSaveNotice({ tone: 'error', text: '当前运行环境未提供安全图片保存接口。' })
            return
        }

        setSaving(true)
        setSaveNotice({ tone: 'info', text: mode === 'copy' ? '正在准备图片副本…' : '正在安全覆盖原图…' })
        try {
            const format = getExportFormat(sourceDescriptor)
            const canvas = renderDocument(sourceImage, document)
            const raster = await canvasToArrayBuffer(canvas, format)
            const result = await window.electronFeatures.saveEditedImage({
                sourcePath,
                mode,
                format,
                raster,
            })

            if (result?.status === 'canceled') {
                setSaveNotice({ tone: 'info', text: '已取消保存，编辑内容仍然保留。' })
                return
            }
            if (result?.status !== 'saved') {
                setSaveNotice({
                    tone: 'error',
                    text: result?.message || '保存失败，原文件未被修改。',
                })
                return
            }

            if (mode === 'overwrite') {
                const rebasedDocument = createEditorDocument(canvas.width, canvas.height)
                setSourceImage(canvas)
                resetHistory(rebasedDocument)
                setSavedDocument(rebasedDocument)
            } else {
                setSavedDocument(document)
            }
            setSaveNotice({
                tone: 'success',
                text: mode === 'copy' ? '图片副本已保存并加入图库。' : '原图已安全更新。',
            })
            onSaved?.(result.image, {
                mode,
                sourcePath,
                outputPath: result.outputPath,
            })
        } catch (error) {
            setSaveNotice({
                tone: 'error',
                text: error?.message || '保存失败，编辑内容仍然保留。',
            })
        } finally {
            setSaving(false)
            setOverwriteDialogOpen(false)
        }
    }, [document, isGif, onSaved, resetHistory, saving, sourceDescriptor, sourceImage, sourcePath])

    useEffect(() => {
        const isEditableTarget = (target) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        const handleKeyDown = (event) => {
            if (isEditableTarget(event.target)) return
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault()
                event.shiftKey ? redo() : undo()
            } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
                event.preventDefault()
                redo()
            } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault()
                handleSave('copy')
            } else if (event.key === 'Escape' && editMode === 'crop') {
                cancelCrop()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [cancelCrop, editMode, handleSave, redo, undo])

    if (!selectedImage) {
        return <div className="PhotoEditor_empty">从左侧图库选择一张图片开始查看或编辑</div>
    }

    const crop = cropRect && document ? clampCropRect(cropRect, document.width, document.height) : null
    const fileName = sourceFileName || getDisplayName(sourcePath)

    return (
        <div className="PhotoEditor_container">
            <header className="PhotoEditor_header">
                <div className="PhotoEditor_identity">
                    <button className="PhotoEditor_backButton" type="button" onClick={onExit} aria-label="返回图片预览">
                        <ArrowBackIcon />
                    </button>
                    <div className="PhotoEditor_fileInfo">
                        <span className="PhotoEditor_modeLabel">编辑模式</span>
                        <strong title={sourcePath}>{fileName}</strong>
                        {document && (
                            <span>{Math.round(document.width)} × {Math.round(document.height)} px</span>
                        )}
                        {dirty && <span className="PhotoEditor_dirtyBadge">未保存</span>}
                    </div>
                </div>

                <div className="PhotoEditor_saveGroup">
                    <button
                        className="PhotoEditor_savePrimary"
                        type="button"
                        onClick={() => handleSave('copy')}
                        disabled={saving || loadState.status !== 'ready'}
                    >
                        <SaveIcon />
                        {saving ? '保存中…' : isGif ? '保存静态副本' : '保存副本'}
                    </button>
                    <button
                        className="PhotoEditor_saveMore"
                        type="button"
                        aria-label="更多保存选项"
                        aria-haspopup="menu"
                        onClick={(event) => setSaveMenuAnchor(event.currentTarget)}
                        disabled={saving || loadState.status !== 'ready'}
                    >
                        <ArrowDropDownIcon />
                    </button>
                    <Menu
                        anchorEl={saveMenuAnchor}
                        open={Boolean(saveMenuAnchor)}
                        onClose={() => setSaveMenuAnchor(null)}
                    >
                        <MenuItem onClick={() => handleSave('copy')}>
                            {isGif ? '保存为静态 PNG 副本' : '保存副本…'}
                        </MenuItem>
                        <MenuItem
                            disabled={isGif}
                            className="PhotoEditor_overwriteMenuItem"
                            onClick={() => {
                                setSaveMenuAnchor(null)
                                setOverwriteDialogOpen(true)
                            }}
                        >
                            覆盖原图…
                        </MenuItem>
                    </Menu>
                </div>
            </header>

            <div className="PhotoEditor_toolbar" aria-label="图片编辑工具栏">
                <div className="PhotoEditor_toolGroup">
                    <ToolButton label="平移与缩放" active={editMode === 'pan'} onClick={() => setEditMode('pan')}>
                        <PanToolAltIcon />
                    </ToolButton>
                    <ToolButton label="左旋转 90°" onClick={() => commit((current) => rotateDocument(current, 'counterclockwise'))}>
                        <RotateLeftIcon />
                    </ToolButton>
                    <ToolButton label="右旋转 90°" onClick={() => commit((current) => rotateDocument(current, 'clockwise'))}>
                        <RotateRightIcon />
                    </ToolButton>
                    <ToolButton label="水平翻转" onClick={() => commit((current) => flipDocument(current, 'x'))}>
                        <FlipIcon />
                    </ToolButton>
                    <ToolButton label="垂直翻转" onClick={() => commit((current) => flipDocument(current, 'y'))}>
                        <FlipIcon className="PhotoEditor_flipVertical" />
                    </ToolButton>
                    <ToolButton label="裁剪" active={editMode === 'crop'} onClick={activateCrop}>
                        <CropIcon />
                    </ToolButton>
                </div>

                <div className="PhotoEditor_toolGroup">
                    <ToolButton label="画笔" active={editMode === 'draw'} onClick={() => setEditMode('draw')}>
                        <BrushIcon />
                    </ToolButton>
                    <ToolButton label="添加文字" active={editMode === 'text'} onClick={() => setEditMode('text')}>
                        <TextFieldsIcon />
                    </ToolButton>
                    <ToolButton label="亮度与对比度" active={editMode === 'filter'} onClick={() => setEditMode('filter')}>
                        <TuneIcon />
                    </ToolButton>
                </div>

                <div className="PhotoEditor_toolGroup PhotoEditor_historyTools">
                    <ToolButton label="撤销 (Ctrl+Z)" disabled={!canUndo || saving} onClick={undo}>
                        <UndoIcon />
                    </ToolButton>
                    <ToolButton label="重做 (Ctrl+Y)" disabled={!canRedo || saving} onClick={redo}>
                        <RedoIcon />
                    </ToolButton>
                    <ToolButton label="适合窗口" onClick={resetView}>
                        <RestartAltIcon />
                    </ToolButton>
                    <ToolButton label="按住查看原图" disabled={!sourceImage}
                        onPointerDown={() => setCompareOriginal(true)}
                        onPointerUp={() => setCompareOriginal(false)}
                        onPointerCancel={() => setCompareOriginal(false)}
                        onPointerLeave={() => setCompareOriginal(false)}
                    >
                        <CompareIcon />
                    </ToolButton>
                    <button className="PhotoEditor_resetEdits" type="button" onClick={resetEdits} disabled={!dirty || saving}>
                        重置编辑
                    </button>
                </div>
            </div>

            {editMode === 'draw' && document && (
                <div className="PhotoEditor_optionsBar">
                    <span>画笔</span>
                    <label className="PhotoEditor_colorField">
                        <span>颜色</span>
                        <input type="color" value={drawColor} onChange={(event) => setDrawColor(event.target.value)} />
                    </label>
                    <label className="PhotoEditor_sliderField">
                        <span>粗细</span>
                        <Slider
                            value={drawWidth}
                            min={1}
                            max={Math.max(20, Math.round(Math.max(document.width, document.height) / 80))}
                            step={1}
                            onChange={(_, value) => setDrawWidth(value)}
                            valueLabelDisplay="auto"
                        />
                    </label>
                </div>
            )}

            {editMode === 'filter' && document && (
                <div className="PhotoEditor_optionsBar PhotoEditor_filterBar">
                    <label className="PhotoEditor_sliderField">
                        <span>亮度 {Math.round(document.brightness * 100)}</span>
                        <Slider
                            value={document.brightness}
                            min={-1}
                            max={1}
                            step={0.01}
                            onChange={(_, value) => commit((current) => ({ ...current, brightness: value }))}
                        />
                    </label>
                    <label className="PhotoEditor_sliderField">
                        <span>对比度 {Math.round(document.contrast)}</span>
                        <Slider
                            value={document.contrast}
                            min={-100}
                            max={100}
                            step={1}
                            onChange={(_, value) => commit((current) => ({ ...current, contrast: value }))}
                        />
                    </label>
                </div>
            )}

            {editMode === 'crop' && crop && (
                <div className="PhotoEditor_optionsBar PhotoEditor_cropBar">
                    <span>裁剪区域 {Math.round(crop.width)} × {Math.round(crop.height)} px</span>
                    <div>
                        <button type="button" onClick={cancelCrop}>取消</button>
                        <button className="confirm" type="button" onClick={confirmCrop}>应用裁剪</button>
                    </div>
                </div>
            )}

            <div className="PhotoEditor_canvas" ref={displayAreaRef}>
                {loadState.status === 'loading' && (
                    <div className="PhotoEditor_canvasMessage"><span className="PhotoEditor_spinner" />{loadState.message}</div>
                )}
                {loadState.status === 'error' && (
                    <div className="PhotoEditor_canvasMessage error">{loadState.message}</div>
                )}
                {visibleDocument && visiblePreview && (
                    <Stage
                        ref={stageRef}
                        width={containerSize.width}
                        height={containerSize.height}
                        scaleX={view.scale}
                        scaleY={view.scale}
                        x={view.x}
                        y={view.y}
                        draggable={editMode === 'pan' && !compareOriginal}
                        onDragEnd={(event) => setView((current) => ({
                            ...current,
                            x: event.target.x(),
                            y: event.target.y(),
                        }))}
                        onWheel={handleWheel}
                        onMouseDown={startDrawing}
                        onMouseMove={continueDrawing}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onClick={addText}
                    >
                        <Layer>
                            <Rect
                                x={0}
                                y={0}
                                width={visibleDocument.width}
                                height={visibleDocument.height}
                                fill="#111318"
                                shadowColor="#000"
                                shadowBlur={30 / view.scale}
                                shadowOpacity={0.45}
                            />
                            <KonvaImage
                                image={visiblePreview}
                                x={0}
                                y={0}
                                width={visibleDocument.width}
                                height={visibleDocument.height}
                                listening={editMode === 'draw' || editMode === 'text'}
                            />

                            {!compareOriginal && document.lines.map((line) => (
                                <Line
                                    key={line.id}
                                    points={line.points}
                                    stroke={line.color}
                                    strokeWidth={line.width}
                                    lineCap="round"
                                    lineJoin="round"
                                    perfectDrawEnabled={false}
                                    listening={false}
                                />
                            ))}

                            {!compareOriginal && document.texts.map((text) => (
                                <Text
                                    key={text.id}
                                    x={text.x}
                                    y={text.y}
                                    text={text.text}
                                    fontSize={text.fontSize}
                                    fill={text.fill}
                                    rotation={text.rotation || 0}
                                    scaleX={text.scaleX ?? 1}
                                    scaleY={text.scaleY ?? 1}
                                    fontFamily="Segoe UI Variable, Segoe UI, sans-serif"
                                    draggable={editMode === 'text'}
                                    onDragEnd={(event) => commit((current) => ({
                                        ...current,
                                        texts: current.texts.map((item) => item.id === text.id
                                            ? { ...item, x: event.target.x(), y: event.target.y() }
                                            : item),
                                    }))}
                                    onDblClick={() => editText(text)}
                                    onDblTap={() => editText(text)}
                                />
                            ))}

                            {!compareOriginal && editMode === 'crop' && crop && (
                                <>
                                    <Rect x={0} y={0} width={document.width} height={crop.y} fill="rgba(0,0,0,.62)" listening={false} />
                                    <Rect x={0} y={crop.y} width={crop.x} height={crop.height} fill="rgba(0,0,0,.62)" listening={false} />
                                    <Rect x={crop.x + crop.width} y={crop.y} width={document.width - crop.x - crop.width} height={crop.height} fill="rgba(0,0,0,.62)" listening={false} />
                                    <Rect x={0} y={crop.y + crop.height} width={document.width} height={document.height - crop.y - crop.height} fill="rgba(0,0,0,.62)" listening={false} />
                                    <Rect
                                        ref={cropRectRef}
                                        {...crop}
                                        stroke="#d45c7b"
                                        strokeWidth={2 / view.scale}
                                        draggable
                                        dragBoundFunc={(position) => ({
                                            x: Math.max(0, Math.min(position.x, document.width - crop.width)),
                                            y: Math.max(0, Math.min(position.y, document.height - crop.height)),
                                        })}
                                        onDragEnd={updateCropFromNode}
                                        onTransformEnd={updateCropFromNode}
                                    />
                                    <Transformer
                                        ref={transformerRef}
                                        rotateEnabled={false}
                                        flipEnabled={false}
                                        anchorSize={10 / view.scale}
                                        borderStroke="#d45c7b"
                                        anchorFill="#fffaff"
                                        anchorStroke="#9d2f5c"
                                        boundBoxFunc={(oldBox, newBox) => (
                                            newBox.width < 16 || newBox.height < 16 ? oldBox : newBox
                                        )}
                                    />
                                </>
                            )}
                        </Layer>
                    </Stage>
                )}

                {compareOriginal && <div className="PhotoEditor_compareBadge">原图</div>}
                <div className="PhotoEditor_zoomBadge">{Math.round(view.scale * 100)}%</div>
            </div>

            {saveNotice && (
                <div className={`PhotoEditor_notice ${saveNotice.tone}`} role={saveNotice.tone === 'error' ? 'alert' : 'status'}>
                    {saveNotice.text}
                    <button type="button" aria-label="关闭提示" onClick={() => setSaveNotice(null)}>×</button>
                </div>
            )}

            <Dialog
                open={overwriteDialogOpen}
                onClose={() => !saving && setOverwriteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                className="PhotoEditor_overwriteDialog"
            >
                <DialogTitle>覆盖原始图片？</DialogTitle>
                <DialogContent>
                    <div className="PhotoEditor_warningLead">
                        <WarningAmberIcon />
                        <span>此操作会替换磁盘上的原文件。应用会先写入并验证临时文件，再执行替换。</span>
                    </div>
                    <div className="PhotoEditor_pathLabel">目标文件</div>
                    <code className="PhotoEditor_sourcePath">{sourcePath}</code>
                    <p className="PhotoEditor_metadataWarning">
                        覆盖后，部分拍摄信息和颜色设置可能无法保留。
                    </p>
                </DialogContent>
                <DialogActions>
                    <button type="button" onClick={() => setOverwriteDialogOpen(false)} disabled={saving}>取消</button>
                    <button className="danger" type="button" onClick={() => handleSave('overwrite')} disabled={saving}>
                        {saving ? '正在覆盖…' : '确认覆盖原图'}
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default PhotoEditor
