const RENDERABLE_PROTOCOL = /^(?:file|data|blob|https?):/i
const WINDOWS_DRIVE = /^[a-zA-Z]:$/

export const toFileUrl = (value = '') => {
    const input = String(value || '').trim()
    if (!input || RENDERABLE_PROTOCOL.test(input)) return input

    const normalized = input.replace(/\\/g, '/')
    const encoded = normalized
        .split('/')
        .map((part, index) => index === 0 && WINDOWS_DRIVE.test(part) ? part : encodeURIComponent(part))
        .join('/')

    if (normalized.startsWith('//')) return `file:${encoded}`
    return `file://${encoded.startsWith('/') ? '' : '/'}${encoded}`
}
