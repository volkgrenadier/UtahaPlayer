const path = require('path');
const {
    buildHomeSummary,
    getFavorites,
    isPlaybackComplete,
    migrateUserConfig,
    replaceMediaRecords,
    searchLibrary,
    setMediaFavorite,
    stableMediaId,
    updatePlaybackProgress,
    upsertMediaRecords,
} = require('./mediaLibrary');

const mediaPath = (name) => path.resolve('C:\\Media', name);

describe('media library migration', () => {
    test('is idempotent and does not invent import timestamps for legacy records', () => {
        const legacy = {
            music: { musicLibrary: { musicList: [{ id: mediaPath('song.mp3'), path: mediaPath('song.mp3'), title: 'Song' }] } },
            video: { videoLibrary: { videoList: [] } },
            photo: { photoLibrary: { slideImagesCache: [{ src: mediaPath('photo.jpg'), thumb: 'data:image/jpeg;base64,abc' }] } },
        };

        const migrated = migrateUserConfig(legacy);
        const migratedAgain = migrateUserConfig(migrated);

        expect(migratedAgain).toEqual(migrated);
        expect(migrated.mediaLibrary.records).toHaveLength(2);
        expect(migrated.mediaLibrary.records.every((record) => record.importedAt === null)).toBe(true);
        expect(migrated.photo.photoLibrary.slideImagesCache[0].thumb).toBeNull();
    });

    test('uses deterministic type-scoped IDs', () => {
        const filePath = mediaPath('same-name.dat');
        expect(stableMediaId('music', filePath)).toBe(stableMediaId('music', filePath));
        expect(stableMediaId('music', filePath)).not.toBe(stableMediaId('video', filePath));
    });
});

describe('media library updates', () => {
    test('merges and deduplicates imports while timestamping only genuinely new records', () => {
        const existingPath = mediaPath('existing.jpg');
        const newPath = mediaPath('new.jpg');
        const migrated = migrateUserConfig({
            photo: { photoLibrary: { slideImagesCache: [{ src: existingPath }] } },
        });
        const updated = upsertMediaRecords(migrated, 'photo', [
            { src: existingPath },
            { src: newPath },
            { src: newPath },
        ], { markImported: true, now: '2026-08-23T00:00:00.000Z' });

        const photos = updated.mediaLibrary.records.filter((record) => record.type === 'photo');
        expect(photos).toHaveLength(2);
        expect(photos.find((record) => record.path === existingPath).importedAt).toBeNull();
        expect(photos.find((record) => record.path === newPath).importedAt).toBe('2026-08-23T00:00:00.000Z');
    });

    test('replaces a legacy photo view without deleting other media types', () => {
        let config = migrateUserConfig({
            music: { musicLibrary: { musicList: [{ path: mediaPath('song.mp3') }] } },
            photo: { photoLibrary: { slideImagesCache: [{ src: mediaPath('one.jpg') }, { src: mediaPath('two.jpg') }] } },
        });
        config = replaceMediaRecords(config, 'photo', [{ src: mediaPath('two.jpg'), rows: 2 }]);

        expect(config.music.musicLibrary.musicList).toHaveLength(1);
        expect(config.photo.photoLibrary.slideImagesCache).toHaveLength(1);
        expect(config.photo.photoLibrary.slideImagesCache[0].rows).toBe(2);
    });
});

describe('activity, playback, and summaries', () => {
    test.each([
        [890_000, 1_000_000, false],
        [900_000, 1_000_000, false],
        [900_001, 1_000_000, true],
        [61_000, 100_000, false],
        [70_000, 100_000, false],
        [70_001, 100_000, true],
    ])('calculates completion for %i/%i as %s', (positionMs, durationMs, expected) => {
        expect(isPlaybackComplete(positionMs, durationMs)).toBe(expected);
    });

    test('persists progress and excludes completed videos from continue items', () => {
        const videoPath = mediaPath('movie.mp4');
        let config = upsertMediaRecords({}, 'video', [{ path: videoPath, title: 'Movie' }], { markImported: true });
        const mediaId = config.video.videoLibrary.videoList[0].id;
        config = updatePlaybackProgress(config, {
            mediaId,
            type: 'video',
            positionMs: 95_000,
            durationMs: 100_000,
        }, '2026-08-23T01:00:00.000Z');

        expect(config.video.videoLibrary.videoList[0].playback.completed).toBe(true);
        expect(buildHomeSummary(config).continueItems).toHaveLength(0);
    });

    test('bounds summary/search payloads and strips inline Base64 artwork', () => {
        const records = Array.from({ length: 50 }, (_, index) => ({
            path: mediaPath(`song-${index}.mp3`),
            title: `Song ${index}`,
            coverUrl: 'data:image/jpeg;base64,large-payload',
        }));
        const config = upsertMediaRecords({}, 'music', records, { markImported: true });
        const summary = buildHomeSummary(config, { limitPerSection: 5 });
        const matches = searchLibrary(config, { query: 'Song', limit: 3 });

        expect(summary.libraries.music).toHaveLength(5);
        expect(summary.recentAdded).toHaveLength(5);
        expect(summary.libraries.music[0].coverUrl).toBeNull();
        expect(matches).toHaveLength(3);
    });

    test('keeps a 10,000-record home summary below 250 KB', () => {
        const records = Array.from({ length: 10_000 }, (_, index) => ({
            path: mediaPath(`large-library-${index}.mp3`),
            title: `Large library song ${index}`,
            coverUrl: 'data:image/jpeg;base64,not-returned',
        }));
        const config = upsertMediaRecords({}, 'music', records, {
            markImported: true,
            now: '2026-08-23T00:00:00.000Z',
        });
        const serialized = JSON.stringify(buildHomeSummary(config, { limitPerSection: 12 }));

        expect(Buffer.byteLength(serialized)).toBeLessThan(250 * 1024);
        expect(serialized).not.toContain('base64');
    });

    test('supports bounded favorites through the canonical record', () => {
        let config = upsertMediaRecords({}, 'music', [{ path: mediaPath('favorite.mp3') }], { markImported: true });
        const mediaId = config.music.musicLibrary.musicList[0].id;
        config = setMediaFavorite(config, { mediaId, type: 'music', favorite: true });

        expect(getFavorites(config, { limit: 1 })).toEqual([
            expect.objectContaining({ id: mediaId, favorite: true }),
        ]);
    });
});
