import { toFileUrl } from './mediaUrl'

describe('media file URLs', () => {
    test('converts Windows and POSIX paths while encoding unsafe characters', () => {
        expect(toFileUrl('C:\\Photos\\summer #1.jpg')).toBe('file:///C:/Photos/summer%20%231.jpg')
        expect(toFileUrl('/Users/me/My Photo.png')).toBe('file:///Users/me/My%20Photo.png')
    })

    test('preserves URLs that are already renderable', () => {
        expect(toFileUrl('file:///C:/Photos/cover.jpg')).toBe('file:///C:/Photos/cover.jpg')
        expect(toFileUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
    })
})
