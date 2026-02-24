import React, { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Line, Text, Rect, Transformer } from 'react-konva'
import Konva from 'konva'
import Tooltip from '@mui/material/Tooltip'
import Slider from '@mui/material/Slider'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import FlipIcon from '@mui/icons-material/Flip'
import CropIcon from '@mui/icons-material/Crop'
import BrushIcon from '@mui/icons-material/Brush'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import TuneIcon from '@mui/icons-material/Tune'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import VisibilityIcon from '@mui/icons-material/Visibility';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import './PhotoEditor.scss'

//  图片渲染子组件
const DisplayImage = ({ src, stageWidth, stageHeight, rotation, flipX, flipY, imageRef, filters, brightness, contrast }) => {
    const [image, setImage] = useState(null)
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        if (!src) return
        const img = new window.Image()
        img.src = src
        img.onload = () => {
            const scale = Math.min(stageWidth / img.width, stageHeight / img.height, 1)
            setImgSize({ width: img.width * scale, height: img.height * scale })
            setImage(img)
        }
    }, [src, stageWidth, stageHeight])

    // 滤镜参数变化时重新缓存
    useEffect(() => {
        if (imageRef?.current && image) {
            imageRef.current.cache()
            imageRef.current.getLayer()?.batchDraw()
        }
    }, [brightness, contrast, image])

    if (!image) return null

    return (
        <KonvaImage
            ref={imageRef}
            image={image}
            x={stageWidth / 2}
            y={stageHeight / 2}
            width={imgSize.width}
            height={imgSize.height}
            offsetX={imgSize.width / 2}
            offsetY={imgSize.height / 2}
            rotation={rotation}
            scaleX={flipX ? -1 : 1}
            scaleY={flipY ? -1 : 1}
            filters={filters}
            brightness={brightness}
            contrast={contrast}
        />
    )
}

//  主组件
const PhotoEditor = ({ selectedImage }) => {
    const displayAreaRef = useRef(null)
    const stageRef = useRef(null)
    const imageRef = useRef(null)
    const cropRectRef = useRef(null)
    const transformerRef = useRef(null)

    // 容器尺寸
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

    // Stage 缩放和位移
    const [stageScale, setStageScale] = useState(1)
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

    // 编辑模式:  'preview' | 'preview' | 'crop' | 'draw' | 'text' | 'filter'
    const [editMode, setEditMode] = useState('view')

    // 旋转 & 翻转
    const [rotation, setRotation] = useState(0)
    const [flipX, setFlipX] = useState(false)
    const [flipY, setFlipY] = useState(false)

    // 滤镜
    const [brightness, setBrightness] = useState(0)
    const [contrast, setContrast] = useState(0)
    const activeFilters = [
        ...(brightness !== 0 ? [Konva.Filters.Brighten] : []),
        ...(contrast !== 0 ? [Konva.Filters.Contrast] : []),
    ]

    // 涂鸦
    const [lines, setLines] = useState([])
    const [drawColor, setDrawColor] = useState('#ff0000')
    const [drawWidth, setDrawWidth] = useState(3)
    const isDrawing = useRef(false)

    // 文字
    const [texts, setTexts] = useState([])

    // 裁剪框
    const [cropRect, setCropRect] = useState({ x: 50, y: 50, width: 200, height: 200 })

    // 历史记录（撤销）
    const [history, setHistory] = useState([])
    const pushHistory = (snapshot) => setHistory(prev => [...prev, snapshot])
    const handleUndo = () => {
        if (history.length === 0) return
        const last = history[history.length - 1]
        setLines(last.lines ?? lines)
        setTexts(last.texts ?? texts)
        setHistory(prev => prev.slice(0, -1))
    }

    // 获取容器尺寸
    useLayoutEffect(() => {
        if (displayAreaRef.current) {
            const { offsetWidth, offsetHeight } = displayAreaRef.current
            setContainerSize({ width: offsetWidth, height: offsetHeight })
        }
    }, [])

    // 切换图片时重置所有编辑状态
    useEffect(() => {
        setRotation(0)
        setFlipX(false)
        setFlipY(false)
        setBrightness(0)
        setContrast(0)
        setLines([])
        setTexts([])
        setEditMode('preview')
        setStageScale(1)
        setStagePos({ x: 0, y: 0 })
        setHistory([])
    }, [selectedImage?.src])

    // 裁剪模式时，挂载 Transformer 到裁剪框
    useEffect(() => {
        if (editMode === 'crop' && transformerRef.current && cropRectRef.current) {
            transformerRef.current.nodes([cropRectRef.current])
            transformerRef.current.getLayer()?.batchDraw()
        }
    }, [editMode])

    // Stage 交互
    const handleWheel = (e) => {
        e.evt.preventDefault()
        const stage = stageRef.current
        const oldScale = stage.scaleX()
        const pointer = stage.getPointerPosition()
        const scaleBy = 1.1
        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
        const clampedScale = Math.max(0.1, Math.min(newScale, 10))
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        }
        setStageScale(clampedScale)
        setStagePos({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        })
    }

    const resetView = () => {
        setStageScale(1)
        setStagePos({ x: 0, y: 0 })
    }
    // 切换预览和编辑状态
    const toggleEditMode = () => {
        
        if (editMode === 'view') {
            setEditMode('preview')
        } else {
            setEditMode('view')
        }
    }

    // 涂鸦事件
    const handleStageMouseDown = (e) => {
        if (editMode !== 'draw') return
        // 点到空白处才开始画线，避免误触 Transformer
        if (e.target !== e.target.getStage() && e.target.getClassName() !== 'Image') return
        isDrawing.current = true
        const pos = stageRef.current.getRelativePointerPosition()
        pushHistory({ lines: [...lines], texts: [...texts] })
        setLines(prev => [...prev, { points: [pos.x, pos.y], color: drawColor, width: drawWidth }])
    }

    const handleStageMouseMove = (e) => {
        if (!isDrawing.current || editMode !== 'draw') return
        const pos = stageRef.current.getRelativePointerPosition()
        setLines(prev => {
            const last = { ...prev[prev.length - 1] }
            last.points = [...last.points, pos.x, pos.y]
            return [...prev.slice(0, -1), last]
        })
    }

    const handleStageMouseUp = () => {
        isDrawing.current = false
    }

    // 文字：点击空白处添加
    const handleStageClick = (e) => {
        if (editMode !== 'text') return
        if (e.target !== e.target.getStage() && e.target.getClassName() !== 'Image') return
        const pos = stageRef.current.getRelativePointerPosition()
        pushHistory({ lines: [...lines], texts: [...texts] })
        setTexts(prev => [...prev, {
            id: Date.now(),
            x: pos.x, y: pos.y,
            text: '双击编辑',
            fontSize: 20,
            fill: drawColor,
            draggable: true,
        }])
    }

    // ---- 裁剪确认 ----
    const confirmCrop = () => {
        if (!stageRef.current) return
        // 导出裁剪区域（坐标需除以 stageScale，因为 Stage 整体缩放了）
        const dataUrl = stageRef.current.toDataURL({
            x: cropRect.x,
            y: cropRect.y,
            width: cropRect.width,
            height: cropRect.height,
            pixelRatio: 2,
        })
        // 这里可以用 dataUrl 更新 selectedImage，或者触发下载
        console.log('裁剪结果:', dataUrl)
        setEditMode('preview')
    }

    // 导出保存
    const handleExport = async () => {
        if (!stageRef.current) return
        // 临时重置 Stage 缩放到 1，确保导出完整图片
        const stage = stageRef.current
        const prevScale = stage.scaleX()
        const prevPos = { x: stage.x(), y: stage.y() }
        stage.scale({ x: 1, y: 1 })
        stage.position({ x: 0, y: 0 })
        stage.batchDraw()

        const dataUrl = stage.toDataURL({ pixelRatio: 2 })

        stage.scale({ x: prevScale, y: prevScale })
        stage.position(prevPos)
        stage.batchDraw()

        // 通过 Electron IPC 保存
        if (window.electronFeatures?.saveImage) {
            await window.electronFeatures.saveImage(dataUrl)
        } else {
            // 降级：浏览器下载
            const a = document.createElement('a')
            a.href = dataUrl
            a.download = 'edited-image.png'
            a.click()
        }
    }

    // 工具栏配置
    const toolbarButtons = [
        {
            icon: <RotateLeftIcon />, tooltip: '左旋转90°',
            onClick: () => setRotation(r => r - 90),
            alwaysActive: true,
        },
        {
            icon: <RotateRightIcon />, tooltip: '右旋转90°',
            onClick: () => setRotation(r => r + 90),
            alwaysActive: true,
        },
        {
            icon: <FlipIcon />, tooltip: '水平翻转',
            onClick: () => setFlipX(f => !f),
            alwaysActive: true,
        },
        {
            icon: <FlipIcon sx={{ transform: 'rotate(90deg)' }} />, tooltip: '垂直翻转',
            onClick: () => setFlipY(f => !f),
            alwaysActive: true,
        },
        {
            icon: <CropIcon />, tooltip: '裁剪',
            onClick: () => setEditMode(m => m === 'crop' ? 'preview' : 'crop'),
            mode: 'crop',
        },
        {
            icon: <BrushIcon />, tooltip: '涂鸦',
            onClick: () => setEditMode(m => m === 'draw' ? 'preview' : 'draw'),
            mode: 'draw',
        },
        {
            icon: <TextFieldsIcon />, tooltip: '文字',
            onClick: () => setEditMode(m => m === 'text' ? 'preview' : 'text'),
            mode: 'text',
        },
        {
            icon: <TuneIcon />, tooltip: '滤镜调节',
            onClick: () => setEditMode(m => m === 'filter' ? 'preview' : 'filter'),
            mode: 'filter',
        },
        {
            icon: <UndoIcon />, tooltip: '撤销',
            onClick: handleUndo,
            alwaysActive: true,
        },
        {
            icon: <RestartAltIcon />, tooltip: '重置视图',
            onClick: resetView,
            alwaysActive: true,
        },
        {
            icon: <SaveIcon />, tooltip: '导出保存',
            onClick: handleExport,
            alwaysActive: true,
        },
    ]

    return (
        <div className="PhotoEditor_container">
            {/* 工具栏 */}
            {selectedImage && (
                <div className="PhotoEditor_toolbar">
                    {
                        <Tooltip key={0} title={'切换浏览/编辑'}>
                            <button
                                className={`PhotoEditor_toolBtn`}
                                onClick={toggleEditMode}
                            >
                                {
                                    editMode !== 'view' 
                                    ? <VisibilityIcon /> 
                                    : <ModeEditIcon />
                                }
                            </button>
                        </Tooltip>
                    }
                    {
                        editMode !== 'view' 
                        ? toolbarButtons.map((btn, i) => (
                            <Tooltip key={i+1} title={btn.tooltip}>
                                <button
                                    className={`PhotoEditor_toolBtn ${editMode === btn.mode ? 'active' : ''}`}
                                    onClick={btn.onClick}
                                >
                                    {btn.icon}
                                </button>
                            </Tooltip>
                        ))
                        : null
                    }

                    {/* 涂鸦模式：颜色和笔宽 */}
                    {editMode === 'draw' && (
                        <div className="PhotoEditor_drawOptions">
                            <input
                                type="color"
                                value={drawColor}
                                onChange={e => setDrawColor(e.target.value)}
                                title="画笔颜色"
                            />
                            <Slider
                                value={drawWidth}
                                min={1} max={20} step={1}
                                onChange={(_, v) => setDrawWidth(v)}
                                sx={{ width: 80 }}
                            />
                        </div>
                    )}

                    {/* 裁剪模式：确认/取消 */}
                    {editMode === 'crop' && (
                        <div className="PhotoEditor_cropOptions">
                            <button className="PhotoEditor_toolBtn confirm" onClick={confirmCrop}>确认裁剪</button>
                            <button className="PhotoEditor_toolBtn" onClick={() => setEditMode('preview')}>取消</button>
                        </div>
                    )}
                </div>
            )}

            {/* 滤镜面板 */}
            {editMode === 'filter' && selectedImage && (
                <div className="PhotoEditor_filterPanel">
                    <label>亮度</label>
                    <Slider value={brightness} min={-1} max={1} step={0.01}
                        onChange={(_, v) => setBrightness(v)} />
                    <label>对比度</label>
                    <Slider value={contrast} min={-100} max={100} step={1}
                        onChange={(_, v) => setContrast(v)} />
                </div>
            )}

            {/* 画布区域 */}
            <div className="PhotoEditor_canvas" ref={displayAreaRef}>
                {selectedImage ? (
                    <Stage
                        ref={stageRef}
                        width={containerSize.width}
                        height={containerSize.height}
                        scaleX={stageScale}
                        scaleY={stageScale}
                        x={stagePos.x}
                        y={stagePos.y}
                        draggable={editMode === 'preview' || editMode === 'view'}
                        onWheel={handleWheel}
                        onMouseDown={handleStageMouseDown}
                        onMouseMove={handleStageMouseMove}
                        onMouseUp={handleStageMouseUp}
                        onClick={handleStageClick}
                    >
                        <Layer>
                            {/* 图片层 */}
                            <DisplayImage
                                src={selectedImage.src}
                                stageWidth={containerSize.width}
                                stageHeight={containerSize.height}
                                rotation={rotation}
                                flipX={flipX}
                                flipY={flipY}
                                imageRef={imageRef}
                                filters={activeFilters}
                                brightness={brightness}
                                contrast={contrast}
                            />

                            {/* 涂鸦层 */}
                            {lines.map((line, i) => (
                                <Line
                                    key={i}
                                    points={line.points}
                                    stroke={line.color}
                                    strokeWidth={line.width}
                                    tension={0.5}
                                    lineCap="round"
                                    lineJoin="round"
                                    globalCompositeOperation="source-over"
                                />
                            ))}

                            {/* 文字层 */}
                            {texts.map((t) => (
                                <Text
                                    key={t.id}
                                    x={t.x} y={t.y}
                                    text={t.text}
                                    fontSize={t.fontSize}
                                    fill={t.fill}
                                    draggable
                                    onDblClick={(e) => {
                                        // 双击文字弹出原生 input 编辑
                                        const textNode = e.target
                                        const stage = stageRef.current
                                        textNode.hide()
                                        stage.batchDraw()
                                        const areaPos = stage.container().getBoundingClientRect()
                                        const input = document.createElement('input')
                                        input.style.cssText = `
                                            position: absolute;
                                            left: ${areaPos.left + textNode.absolutePosition().x}px;
                                            top: ${areaPos.top + textNode.absolutePosition().y}px;
                                            font-size: ${t.fontSize * stageScale}px;
                                            border: 1px dashed #aaa;
                                            background: transparent;
                                            color: ${t.fill};
                                            outline: none;
                                            z-index: 999;
                                        `
                                        input.value = t.text
                                        document.body.appendChild(input)
                                        input.focus()
                                        input.addEventListener('blur', () => {
                                            setTexts(prev => prev.map(item =>
                                                item.id === t.id ? { ...item, text: input.value } : item
                                            ))
                                            textNode.show()
                                            stage.batchDraw()
                                            document.body.removeChild(input)
                                        })
                                    }}
                                />
                            ))}

                            {/* 裁剪框层 */}
                            {editMode === 'crop' && (
                                <>
                                    <Rect
                                        x={0} y={0}
                                        width={containerSize.width} height={containerSize.height}
                                        fill="black" opacity={0.45}
                                        listening={false}
                                    />
                                    <Rect
                                        ref={cropRectRef}
                                        x={cropRect.x} y={cropRect.y}
                                        width={cropRect.width} height={cropRect.height}
                                        fill="transparent"
                                        stroke="white" strokeWidth={2}
                                        dash={[6, 3]}
                                        draggable
                                        onDragEnd={e => setCropRect(r => ({ ...r, x: e.target.x(), y: e.target.y() }))}
                                        onTransformEnd={() => {
                                            const node = cropRectRef.current
                                            setCropRect({
                                                x: node.x(), y: node.y(),
                                                width: Math.max(10, node.width() * node.scaleX()),
                                                height: Math.max(10, node.height() * node.scaleY()),
                                            })
                                            node.scaleX(1)
                                            node.scaleY(1)
                                        }}
                                    />
                                    <Transformer
                                        ref={transformerRef}
                                        rotateEnabled={false}
                                        keepRatio={false}
                                        borderStroke="white"
                                        anchorStroke="white"
                                        anchorFill="#333"
                                    />
                                </>
                            )}
                        </Layer>
                    </Stage>
                ) : (
                    <div className="PhotoEditor_placeholder">请选择一张图片</div>
                )}
            </div>
        </div>
    )
}

export default PhotoEditor