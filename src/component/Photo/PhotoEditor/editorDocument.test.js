import {
    clampCropRect,
    createEditorDocument,
    cropDocument,
    flipDocument,
    getExportFormat,
    rotateDocument,
    transformPoint,
} from './editorDocument'

describe('photo editor document geometry', () => {
    test('clockwise rotation swaps bounds and maps source corners into the output', () => {
        const rotated = rotateDocument(createEditorDocument(400, 300), 'clockwise')

        expect(rotated.width).toBe(300)
        expect(rotated.height).toBe(400)
        expect(transformPoint(rotated.matrix, { x: 0, y: 0 })).toEqual({ x: 300, y: 0 })
        expect(transformPoint(rotated.matrix, { x: 400, y: 300 })).toEqual({ x: 0, y: 400 })
    })

    test('four clockwise rotations restore source geometry', () => {
        let document = createEditorDocument(640, 480)
        for (let index = 0; index < 4; index += 1) {
            document = rotateDocument(document, 'clockwise')
        }

        expect(document.width).toBe(640)
        expect(document.height).toBe(480)
        expect(document.matrix).toEqual([1, 0, 0, 1, 0, 0])
    })

    test('crop translates source pixels into the new document bounds', () => {
        const cropped = cropDocument(createEditorDocument(800, 600), {
            x: 100,
            y: 75,
            width: 320,
            height: 240,
        })

        expect(cropped.width).toBe(320)
        expect(cropped.height).toBe(240)
        expect(transformPoint(cropped.matrix, { x: 100, y: 75 })).toEqual({ x: 0, y: 0 })
    })

    test('flip transforms annotations in document pixel coordinates', () => {
        const document = {
            ...createEditorDocument(100, 80),
            lines: [{ points: [10, 20, 90, 20], color: '#fff', width: 2 }],
        }
        const flipped = flipDocument(document, 'x')

        expect(flipped.lines[0].points).toEqual([90, 20, 10, 20])
    })

    test.each([
        ['x', 'scaleX'],
        ['y', 'scaleY'],
    ])('keeps rotated text orientation correct after a global %s-axis flip', (axis, scaleKey) => {
        const rotated = rotateDocument({
            ...createEditorDocument(100, 80),
            texts: [{ x: 20, y: 10, text: 'Label', rotation: 0, scaleX: 1, scaleY: 1 }],
        }, 'clockwise')
        const flipped = flipDocument(rotated, axis)

        expect(rotated.texts[0].rotation).toBe(90)
        expect(flipped.texts[0].rotation).toBe(-90)
        expect(flipped.texts[0][scaleKey]).toBe(-1)
    })

    test('crop rectangles cannot escape the current document', () => {
        expect(clampCropRect({ x: -4, y: 90, width: 500, height: 20 }, 100, 100)).toEqual({
            x: 0,
            y: 84,
            width: 100,
            height: 16,
        })
    })

    test('save format preserves JPEG and flattens GIF to PNG', () => {
        expect(getExportFormat('C:\\photos\\portrait.JPEG')).toBe('jpeg')
        expect(getExportFormat('C:\\photos\\motion.gif')).toBe('png')
    })
})
