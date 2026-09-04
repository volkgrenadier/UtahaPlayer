const crypto = require('crypto');
const path = require('path');
const { fileURLToPath } = require('url');

const MEDIA_LIBRARY_VERSION = 1;
const MEDIA_RECORD_VERSION = 1;
const MEDIA_TYPES = Object.freeze(['music', 'video', 'photo']);
const DEFAULT_SECTION_LIMIT = 12;
const MAX_SECTION_LIMIT = 24;
const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 100;

function cloneJson(value) {
    if (!value || typeof value !== 'object') return {};
    return JSON.parse(JSON.stringify(value));
}

function isMediaType(value) {
    return MEDIA_TYPES.includes(value);
}

function getRecordPath(record) {
    if (!record || typeof record !== 'object') return '';
    const candidate = record.path || record.src;
    if (typeof candidate !== 'string' || !candidate.trim()) return '';

    try {
        return /^file:\/\//i.test(candidate) ? fileURLToPath(candidate) : candidate;
    } catch (_error) {
        return candidate;
    }
}

function getPathKey(filePath) {
    if (typeof filePath !== 'string' || !filePath.trim()) return '';
    const normalized = path.normalize(filePath.trim());
    return process.platform === 'win32' ? normalized.toLocaleLowerCase('en-US') : normalized;
}

function stableMediaId(type, filePath) {
    if (!isMediaType(type)) throw new TypeError(`Unsupported media type: ${type}`);
    const pathKey = getPathKey(filePath);
    if (!pathKey) throw new TypeError('A media path is required');
    const digest = crypto.createHash('sha256').update(`${type}\0${pathKey}`).digest('hex').slice(0, 24);
    return `${type}_${digest}`;
}

function toIsoOrNull(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePlayback(playback) {
    if (!playback || typeof playback !== 'object') return null;
    const positionMs = Math.max(0, Number(playback.positionMs) || 0);
    const durationMs = Math.max(0, Number(playback.durationMs) || 0);
    if (!positionMs && !durationMs && !playback.updatedAt) return null;

    return {
        positionMs: durationMs ? Math.min(positionMs, durationMs) : positionMs,
        durationMs,
        completed: Boolean(playback.completed),
        updatedAt: toIsoOrNull(playback.updatedAt),
    };
}

function normalizeMediaRecord(type, input, options = {}) {
    if (!isMediaType(type) || !input || typeof input !== 'object') return null;
    const filePath = getRecordPath(input);
    if (!filePath) return null;

    const importedAt = Object.prototype.hasOwnProperty.call(input, 'importedAt')
        ? toIsoOrNull(input.importedAt)
        : toIsoOrNull(options.importedAt);
    const thumbnailUrl = [input.thumbnailUrl, input.thumb]
        .find((value) => typeof value === 'string' && value && !value.startsWith('data:')) || null;
    const record = {
        ...input,
        recordVersion: MEDIA_RECORD_VERSION,
        id: stableMediaId(type, filePath),
        type,
        path: filePath,
        title: input.title || path.basename(filePath, path.extname(filePath)),
        importedAt,
        lastAccessedAt: toIsoOrNull(input.lastAccessedAt),
        playback: normalizePlayback(input.playback),
        favorite: Boolean(input.favorite),
        thumbnailUrl,
    };

    if (type === 'photo') record.src = filePath;
    delete record.thumb;
    return record;
}

function chooseLatestDate(left, right) {
    if (!left) return right || null;
    if (!right) return left;
    return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function mergeNormalizedRecords(existing, incoming) {
    if (!existing) return incoming;
    const existingPlaybackTime = existing.playback?.updatedAt;
    const incomingPlaybackTime = incoming.playback?.updatedAt;
    const playback = !existingPlaybackTime
        ? (incoming.playback || existing.playback || null)
        : (!incomingPlaybackTime || new Date(existingPlaybackTime) >= new Date(incomingPlaybackTime)
            ? existing.playback
            : incoming.playback);

    return {
        ...existing,
        ...incoming,
        id: existing.id,
        importedAt: existing.importedAt || incoming.importedAt || null,
        lastAccessedAt: chooseLatestDate(existing.lastAccessedAt, incoming.lastAccessedAt),
        playback,
        favorite: Boolean(existing.favorite || incoming.favorite),
        thumbnailUrl: incoming.thumbnailUrl || existing.thumbnailUrl || null,
    };
}

function mergeRecordArrays(existingRecords, type, incomingItems, options = {}) {
    const records = Array.isArray(existingRecords) ? [...existingRecords] : [];
    const byId = new Map(records.map((record, index) => [record.id, index]));
    const now = toIsoOrNull(options.now) || new Date().toISOString();

    for (const item of Array.isArray(incomingItems) ? incomingItems : []) {
        const candidate = normalizeMediaRecord(type, item);
        if (!candidate) continue;
        const existingIndex = byId.get(candidate.id);
        if (existingIndex === undefined) {
            if (options.markImported) candidate.importedAt = now;
            byId.set(candidate.id, records.length);
            records.push(candidate);
        } else {
            records[existingIndex] = mergeNormalizedRecords(records[existingIndex], candidate);
        }
    }

    return records;
}

function ensureLegacyShape(config) {
    config.music = config.music && typeof config.music === 'object' ? config.music : {};
    config.music.musicLibrary = config.music.musicLibrary && typeof config.music.musicLibrary === 'object'
        ? config.music.musicLibrary
        : {};
    config.music.musicLibrary.musicFolders = Array.isArray(config.music.musicLibrary.musicFolders)
        ? config.music.musicLibrary.musicFolders
        : [];
    config.music.volume ??= 25;
    config.music.playerEffect ??= 'ImmersiveLyrics';

    config.video = config.video && typeof config.video === 'object' ? config.video : {};
    config.video.videoLibrary = config.video.videoLibrary && typeof config.video.videoLibrary === 'object'
        ? config.video.videoLibrary
        : {};
    config.video.videoLibrary.videoFolders = Array.isArray(config.video.videoLibrary.videoFolders)
        ? config.video.videoLibrary.videoFolders
        : [];
    config.video.volume ??= 25;

    config.photo = config.photo && typeof config.photo === 'object' ? config.photo : {};
    config.photo.photoLibrary = config.photo.photoLibrary && typeof config.photo.photoLibrary === 'object'
        ? config.photo.photoLibrary
        : {};
    config.photo.photoPlayCount ??= 4;
    return config;
}

function syncLegacyLibraries(inputConfig) {
    const config = ensureLegacyShape(inputConfig);
    const records = Array.isArray(config.mediaLibrary?.records) ? config.mediaLibrary.records : [];
    config.music.musicLibrary.musicList = records.filter((record) => record.type === 'music');
    config.video.videoLibrary.videoList = records.filter((record) => record.type === 'video');
    config.photo.photoLibrary.slideImagesCache = records
        .filter((record) => record.type === 'photo')
        .map((record) => ({
            ...record,
            src: record.path,
            thumb: record.thumbnailUrl || null,
        }));
    return config;
}

function migrateUserConfig(inputConfig) {
    const config = ensureLegacyShape(cloneJson(inputConfig));
    const canonical = Array.isArray(config.mediaLibrary?.records) ? config.mediaLibrary.records : [];
    let records = [];

    for (const type of MEDIA_TYPES) {
        records = mergeRecordArrays(
            records,
            type,
            canonical.filter((record) => record?.type === type),
        );
    }
    records = mergeRecordArrays(records, 'music', config.music.musicLibrary.musicList || []);
    records = mergeRecordArrays(records, 'video', config.video.videoLibrary.videoList || []);
    records = mergeRecordArrays(records, 'photo', config.photo.photoLibrary.slideImagesCache || []);

    config.mediaLibrary = {
        version: MEDIA_LIBRARY_VERSION,
        records,
    };
    return syncLegacyLibraries(config);
}

function upsertMediaRecords(inputConfig, type, items, options = {}) {
    const config = migrateUserConfig(inputConfig);
    config.mediaLibrary.records = mergeRecordArrays(
        config.mediaLibrary.records,
        type,
        items,
        options,
    );
    return syncLegacyLibraries(config);
}

function removeMediaRecord(inputConfig, type, identifier) {
    const config = migrateUserConfig(inputConfig);
    const identifierKey = getPathKey(identifier);
    config.mediaLibrary.records = config.mediaLibrary.records.filter((record) => {
        if (record.type !== type) return true;
        return record.id !== identifier && getPathKey(record.path) !== identifierKey;
    });
    return syncLegacyLibraries(config);
}

function replaceMediaRecords(inputConfig, type, items, options = {}) {
    const config = migrateUserConfig(inputConfig);
    const existingForType = config.mediaLibrary.records.filter((record) => record.type === type);
    const otherRecords = config.mediaLibrary.records.filter((record) => record.type !== type);
    const existingById = new Map(existingForType.map((record) => [record.id, record]));
    const now = toIsoOrNull(options.now) || new Date().toISOString();
    const nextForType = [];
    const seen = new Set();

    for (const item of Array.isArray(items) ? items : []) {
        const candidate = normalizeMediaRecord(type, item);
        if (!candidate || seen.has(candidate.id)) continue;
        seen.add(candidate.id);
        const existing = existingById.get(candidate.id);
        if (existing) {
            nextForType.push(mergeNormalizedRecords(existing, candidate));
        } else {
            if (options.markImported) candidate.importedAt = now;
            nextForType.push(candidate);
        }
    }

    config.mediaLibrary.records = [...otherRecords, ...nextForType];
    return syncLegacyLibraries(config);
}

function findMediaRecord(config, mediaId, type) {
    const records = Array.isArray(config?.mediaLibrary?.records) ? config.mediaLibrary.records : [];
    return records.find((record) => (
        (!type || record.type === type)
        && (record.id === mediaId || getPathKey(record.path) === getPathKey(mediaId))
    ));
}

function isPlaybackComplete(positionMs, durationMs) {
    const position = Math.max(0, Number(positionMs) || 0);
    const duration = Math.max(0, Number(durationMs) || 0);
    if (!position || !duration) return false;
    return position / duration > 0.9 || duration - position < 30_000;
}

function updatePlaybackProgress(inputConfig, payload, now = new Date().toISOString()) {
    const config = migrateUserConfig(inputConfig);
    const type = payload?.type;
    if (!isMediaType(type)) throw new TypeError('A valid media type is required');
    const record = findMediaRecord(config, payload?.mediaId, type);
    if (!record) throw new Error('MEDIA_NOT_FOUND');

    const durationMs = Math.max(0, Number(payload.durationMs) || 0);
    const rawPosition = Math.max(0, Number(payload.positionMs) || 0);
    const positionMs = durationMs ? Math.min(rawPosition, durationMs) : rawPosition;
    const updatedAt = toIsoOrNull(now) || new Date().toISOString();
    record.playback = {
        positionMs,
        durationMs,
        completed: type === 'video' && isPlaybackComplete(positionMs, durationMs),
        updatedAt,
    };
    record.lastAccessedAt = updatedAt;
    return syncLegacyLibraries(config);
}

function recordMediaActivity(inputConfig, payload, now = new Date().toISOString()) {
    const config = migrateUserConfig(inputConfig);
    const record = findMediaRecord(config, payload?.mediaId, payload?.type);
    if (!record) throw new Error('MEDIA_NOT_FOUND');
    record.lastAccessedAt = toIsoOrNull(now) || new Date().toISOString();
    return syncLegacyLibraries(config);
}

function setMediaFavorite(inputConfig, payload) {
    const config = migrateUserConfig(inputConfig);
    const record = findMediaRecord(config, payload?.mediaId, payload?.type);
    if (!record) throw new Error('MEDIA_NOT_FOUND');
    record.favorite = Boolean(payload.favorite);
    return syncLegacyLibraries(config);
}

function stripDataUrl(value) {
    return typeof value === 'string' && value.startsWith('data:') ? null : value;
}

function toMediaSummary(record) {
    const playback = normalizePlayback(record.playback);
    const metadataDurationMs = Number(record.duration) > 0 ? Math.round(Number(record.duration) * 1000) : 0;
    const subtitle = record.type === 'music'
        ? [record.artist, record.album].filter(Boolean).join(' · ')
        : (record.type === 'video' ? [record.width && record.height ? `${record.width}×${record.height}` : null, record.format].filter(Boolean).join(' · ') : '');
    return {
        id: record.id,
        type: record.type,
        path: record.path,
        src: record.type === 'photo' ? record.path : undefined,
        title: record.title,
        subtitle,
        artist: record.artist || null,
        album: record.album || null,
        duration: Number(record.duration) || null,
        positionMs: playback?.positionMs || 0,
        durationMs: playback?.durationMs || metadataDurationMs,
        width: Number(record.width) || null,
        height: Number(record.height) || null,
        thumbnailUrl: stripDataUrl(record.thumbnailUrl) || null,
        thumb: stripDataUrl(record.thumbnailUrl) || null,
        coverUrl: stripDataUrl(record.coverUrl) || stripDataUrl(record.thumbnailUrl) || null,
        importedAt: record.importedAt || null,
        lastAccessedAt: record.lastAccessedAt || null,
        playback,
        favorite: Boolean(record.favorite),
    };
}

function sortByDateDesc(records, getDate) {
    return [...records].sort((left, right) => {
        const leftTime = new Date(getDate(left) || 0).getTime();
        const rightTime = new Date(getDate(right) || 0).getTime();
        return rightTime - leftTime || left.title.localeCompare(right.title);
    });
}

function clampLimit(value, fallback, maximum) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(1, Math.min(maximum, Math.floor(parsed)));
}

function buildHomeSummary(inputConfig, options = {}) {
    const config = migrateUserConfig(inputConfig);
    const records = config.mediaLibrary.records;
    const limit = clampLimit(options.limitPerSection, DEFAULT_SECTION_LIMIT, MAX_SECTION_LIMIT);
    const summaries = records.map(toMediaSummary);
    const nowPlaying = sortByDateDesc(
        summaries.filter((record) => (
            record.type === 'music'
            && record.playback?.updatedAt
            && (!record.playback.durationMs || record.playback.positionMs < record.playback.durationMs)
        )),
        (record) => record.playback.updatedAt,
    )[0];
    const unfinishedVideos = sortByDateDesc(
        summaries.filter((record) => (
            record.type === 'video'
            && record.playback?.positionMs > 0
            && !record.playback.completed
        )),
        (record) => record.playback.updatedAt,
    );
    const recentItems = sortByDateDesc(
        summaries.filter((record) => record.lastAccessedAt || record.playback?.updatedAt),
        (record) => record.lastAccessedAt || record.playback?.updatedAt,
    ).slice(0, limit);
    const recentAdded = sortByDateDesc(
        summaries.filter((record) => record.importedAt),
        (record) => record.importedAt,
    ).slice(0, limit);

    return {
        counts: Object.fromEntries(MEDIA_TYPES.map((type) => [
            type,
            summaries.filter((record) => record.type === type).length,
        ])),
        nowPlaying,
        continueItems: [
            ...(nowPlaying ? [nowPlaying] : []),
            ...unfinishedVideos,
        ].slice(0, limit),
        recentItems,
        recentAdded,
        libraries: Object.fromEntries(MEDIA_TYPES.map((type) => [
            type,
            summaries.filter((record) => record.type === type).slice(0, limit),
        ])),
    };
}

function searchLibrary(inputConfig, options = {}) {
    const config = migrateUserConfig(inputConfig);
    const query = String(options.query || '').trim().toLocaleLowerCase();
    const requestedTypes = Array.isArray(options.types)
        ? options.types.filter(isMediaType)
        : MEDIA_TYPES;
    const types = requestedTypes.length ? new Set(requestedTypes) : new Set(MEDIA_TYPES);
    const limit = clampLimit(options.limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);

    return config.mediaLibrary.records
        .filter((record) => types.has(record.type))
        .filter((record) => {
            if (!query) return true;
            return [record.title, record.artist, record.album, record.path]
                .filter(Boolean)
                .some((value) => String(value).toLocaleLowerCase().includes(query));
        })
        .sort((left, right) => {
            const leftTime = new Date(left.lastAccessedAt || left.importedAt || 0).getTime();
            const rightTime = new Date(right.lastAccessedAt || right.importedAt || 0).getTime();
            return rightTime - leftTime || left.title.localeCompare(right.title);
        })
        .slice(0, limit)
        .map(toMediaSummary);
}

function getRecentActivity(inputConfig, options = {}) {
    const config = migrateUserConfig(inputConfig);
    const limit = clampLimit(options.limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
    return sortByDateDesc(
        config.mediaLibrary.records.filter((record) => record.lastAccessedAt || record.playback?.updatedAt),
        (record) => record.lastAccessedAt || record.playback?.updatedAt,
    ).slice(0, limit).map(toMediaSummary);
}

function getFavorites(inputConfig, options = {}) {
    const config = migrateUserConfig(inputConfig);
    const limit = clampLimit(options.limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
    return sortByDateDesc(
        config.mediaLibrary.records.filter((record) => record.favorite),
        (record) => record.lastAccessedAt || record.importedAt,
    ).slice(0, limit).map(toMediaSummary);
}

module.exports = {
    MEDIA_LIBRARY_VERSION,
    MEDIA_RECORD_VERSION,
    MEDIA_TYPES,
    buildHomeSummary,
    findMediaRecord,
    getFavorites,
    getPathKey,
    getRecentActivity,
    isPlaybackComplete,
    migrateUserConfig,
    normalizeMediaRecord,
    recordMediaActivity,
    replaceMediaRecords,
    removeMediaRecord,
    searchLibrary,
    setMediaFavorite,
    stableMediaId,
    syncLegacyLibraries,
    toMediaSummary,
    updatePlaybackProgress,
    upsertMediaRecords,
};
