const { createMainWindowOptions, createTitleBarOptions } = require('./windowOptions');

describe('native window configuration', () => {
    test('uses Windows title-bar overlay, Mica, and the approved window bounds', () => {
        const options = createMainWindowOptions({
            platform: 'win32',
            isPackaged: true,
            preloadPath: 'preload.js',
        });

        expect(options).toMatchObject({
            width: 1280,
            minWidth: 1024,
            height: 800,
            minHeight: 640,
            titleBarStyle: 'hidden',
            backgroundMaterial: 'mica',
            titleBarOverlay: {
                color: '#f4eff4',
                symbolColor: '#281f2b',
                height: 48,
            },
        });
        expect(options).not.toHaveProperty('frame');
        expect(options.webPreferences).toMatchObject({
            nodeIntegration: false,
            contextIsolation: true,
            devTools: false,
        });
    });

    test('keeps native macOS traffic lights without Windows material', () => {
        const options = createMainWindowOptions({
            platform: 'darwin',
            isPackaged: false,
            preloadPath: 'preload.js',
        });

        expect(createTitleBarOptions('darwin')).toEqual({
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: 16, y: 15 },
        });
        expect(options).not.toHaveProperty('backgroundMaterial');
        expect(options.webPreferences.devTools).toBe(true);
    });
});
