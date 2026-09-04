const IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0]

const roundPixel = (value) => Math.max(1, Math.round(Number(value) || 0))

export const createEditorDocument = (width, height) => ({
    sourceWidth: roundPixel(width),
    sourceHeight: roundPixel(height),
    width: roundPixel(width),
    height: roundPixel(height),
    matrix: [...IDENTITY_MATRIX],
    brightness: 0,
    contrast: 0,
    lines: [],
    texts: [],
})

export const multiplyAffine = (left, right) => {
    const [a1, b1, c1, d1, e1, f1] = left
    const [a2, b2, c2, d2, e2, f2] = right

    return [
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    ].map((value) => Math.abs(value) < 1e-10 ? 0 : value)
}

export const transformPoint = ([a, b, c, d, e, f], point) => ({
    x: a * point.x + c * point.y + e,
    y: b * point.x + d * point.y + f,
})

const transformLine = (line, matrix) => {
    const points = []
    for (let index = 0; index < line.points.length; index += 2) {
        const point = transformPoint(matrix, {
            x: line.points[index],
            y: line.points[index + 1],
        })
        points.push(point.x, point.y)
    }
    return { ...line, points }
}

const transformText = (text, matrix, rotationDelta = 0, flipAxis = null) => {
    const position = transformPoint(matrix, text)
    const transformed = {
        ...text,
        x: position.x,
        y: position.y,
        rotation: flipAxis ? -(text.rotation || 0) : (text.rotation || 0) + rotationDelta,
    }

    if (flipAxis === 'x') transformed.scaleX = -(text.scaleX ?? 1)
    if (flipAxis === 'y') transformed.scaleY = -(text.scaleY ?? 1)
    return transformed
}

const transformAnnotations = (document, matrix, options = {}) => ({
    lines: document.lines.map((line) => transformLine(line, matrix)),
    texts: document.texts.map((text) => transformText(
        text,
        matrix,
        options.rotationDelta,
        options.flipAxis,
    )),
})

export const rotateDocument = (document, direction) => {
    const clockwise = direction === 'clockwise'
    const operation = clockwise
        ? [0, 1, -1, 0, document.height, 0]
        : [0, -1, 1, 0, 0, document.width]
    const annotations = transformAnnotations(document, operation, {
        rotationDelta: clockwise ? 90 : -90,
    })

    return {
        ...document,
        width: document.height,
        height: document.width,
        matrix: multiplyAffine(operation, document.matrix),
        ...annotations,
    }
}

export const flipDocument = (document, axis) => {
    const horizontal = axis === 'x'
    const operation = horizontal
        ? [-1, 0, 0, 1, document.width, 0]
        : [1, 0, 0, -1, 0, document.height]
    const annotations = transformAnnotations(document, operation, { flipAxis: axis })

    return {
        ...document,
        matrix: multiplyAffine(operation, document.matrix),
        ...annotations,
    }
}

export const clampCropRect = (rect, documentWidth, documentHeight) => {
    const minimum = Math.min(16, documentWidth, documentHeight)
    const x = Math.max(0, Math.min(Number(rect.x) || 0, documentWidth - minimum))
    const y = Math.max(0, Math.min(Number(rect.y) || 0, documentHeight - minimum))
    const width = Math.max(minimum, Math.min(Number(rect.width) || minimum, documentWidth - x))
    const height = Math.max(minimum, Math.min(Number(rect.height) || minimum, documentHeight - y))

    return { x, y, width, height }
}

export const cropDocument = (document, requestedRect) => {
    const rect = clampCropRect(requestedRect, document.width, document.height)
    const operation = [1, 0, 0, 1, -rect.x, -rect.y]
    const annotations = transformAnnotations(document, operation)

    return {
        ...document,
        width: roundPixel(rect.width),
        height: roundPixel(rect.height),
        matrix: multiplyAffine(operation, document.matrix),
        ...annotations,
    }
}

export const fitDocumentInViewport = (documentWidth, documentHeight, viewportWidth, viewportHeight) => {
    const availableWidth = Math.max(1, viewportWidth - 56)
    const availableHeight = Math.max(1, viewportHeight - 56)
    const scale = Math.min(availableWidth / documentWidth, availableHeight / documentHeight)

    return {
        scale,
        x: (viewportWidth - documentWidth * scale) / 2,
        y: (viewportHeight - documentHeight * scale) / 2,
    }
}

const applyImageFilter = (context, document) => {
    const brightness = Math.max(0, 1 + document.brightness)
    const contrast = Math.max(0, 1 + document.contrast / 100)
    context.filter = `brightness(${brightness}) contrast(${contrast})`
}

export const renderDocumentBase = (image, document, maxPreviewEdge = Number.POSITIVE_INFINITY) => {
    const outputScale = Math.min(1, maxPreviewEdge / Math.max(document.width, document.height))
    const canvas = window.document.createElement('canvas')
    canvas.width = roundPixel(document.width * outputScale)
    canvas.height = roundPixel(document.height * outputScale)
    const context = canvas.getContext('2d')
    const [a, b, c, d, e, f] = document.matrix
    context.save()
    applyImageFilter(context, document)
    context.setTransform(
        a * outputScale,
        b * outputScale,
        c * outputScale,
        d * outputScale,
        e * outputScale,
        f * outputScale,
    )
    context.drawImage(image, 0, 0, document.sourceWidth, document.sourceHeight)
    context.restore()
    return canvas
}

const drawLine = (context, line) => {
    if (!line.points || line.points.length < 2) return
    context.save()
    context.strokeStyle = line.color
    context.lineWidth = line.width
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(line.points[0], line.points[1])
    for (let index = 2; index < line.points.length; index += 2) {
        context.lineTo(line.points[index], line.points[index + 1])
    }
    context.stroke()
    context.restore()
}

const drawText = (context, text) => {
    context.save()
    context.translate(text.x, text.y)
    context.rotate(((text.rotation || 0) * Math.PI) / 180)
    context.scale(text.scaleX ?? 1, text.scaleY ?? 1)
    context.fillStyle = text.fill
    context.font = `${text.fontSize}px "Segoe UI Variable", "Segoe UI", sans-serif`
    context.textBaseline = 'top'
    String(text.text || '').split('\n').forEach((line, index) => {
        context.fillText(line, 0, index * text.fontSize * 1.2)
    })
    context.restore()
}

export const renderDocument = (image, document) => {
    const canvas = renderDocumentBase(image, document)
    const context = canvas.getContext('2d')
    document.lines.forEach((line) => drawLine(context, line))
    document.texts.forEach((text) => drawText(context, text))
    return canvas
}

export const canvasToArrayBuffer = (canvas, format) => new Promise((resolve, reject) => {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const quality = format === 'jpeg' ? 0.92 : undefined
    canvas.toBlob(async (blob) => {
        if (!blob) {
            reject(new Error('无法生成图片数据'))
            return
        }
        resolve(blob.arrayBuffer())
    }, mimeType, quality)
})

export const getSourceExtension = (sourcePath = '') => {
    const cleanPath = sourcePath.split(/[?#]/)[0]
    const match = cleanPath.match(/\.([^.\\/]+)$/)
    return match ? match[1].toLowerCase() : ''
}

export const getExportFormat = (sourcePath = '') => {
    const extension = getSourceExtension(sourcePath)
    return extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : 'png'
}

export const getDisplayName = (sourcePath = '') => {
    const cleanPath = sourcePath.split(/[?#]/)[0]
    return decodeURIComponent(cleanPath.split(/[\\/]/).pop() || '图片')
}
