function createTitleBarOptions(platform) {
    if (platform === 'darwin') {
        return {
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: 16, y: 15 },
        };
    }
    return {
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#f4eff4',
            symbolColor: '#281f2b',
            height: 48,
        },
    };
}

function createMainWindowOptions({ platform, isPackaged, preloadPath }) {
    return {
        width: 1280,
        minWidth: 1024,
        height: 800,
        minHeight: 640,
        show: false,
        title: 'Utaha Player',
        backgroundColor: '#f4eff4',
        ...(platform === 'win32' ? { backgroundMaterial: 'mica' } : {}),
        ...createTitleBarOptions(platform),
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            devTools: !isPackaged,
        },
    };
}

module.exports = {
    createMainWindowOptions,
    createTitleBarOptions,
};
