export const normalizeMediaPath = (value = '') => String(value || '')
    .replace(/\\/g, '/')
    .toLocaleLowerCase()

export const findRequestedMedia = (items = [], request = {}) => {
    const requestedPath = normalizeMediaPath(request.mediaPath)
    return items.find((item) => (
        (request.mediaId && item?.id === request.mediaId)
        || (requestedPath && normalizeMediaPath(item?.path || item?.src) === requestedPath)
    )) || null
}
