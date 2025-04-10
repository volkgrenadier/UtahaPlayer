const { app, BrowserWindow, ipcMain, screen, Tray, Menu, dialog, protocol } = require('electron');
const { parseFile } = require('music-metadata')
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let movingInterval = null;
let userConfig = {}    //  用户配置
// 存储音乐文件信息的对象
let musicLibrary = {
    musicList: [],
    musicFolders: []
};

/**
 * 应用级系统型事件处理函数
 */
//  关闭app
function closeApp() {   
    updateUserConfigFileBeforeClose()   //  关闭程序前写入文件
    app.quit()
}
//  最小化窗口
function minimizeWindow() { 
    mainWindow.minimize();
}
//  最大化窗口
function maximizeWindow() { 
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize(); //  true means window has been restored, for Header.js
    }
    else{
        mainWindow.maximize();   //  false means window has been maximized, for Header.js
    }
}
//  移动窗口
function moveWin(e,canMove) {    
    let winStartPosition = {x: 0, y: 0};
    let cursorStartPosition = {x: 0, y: 0};
    
    // console.log(canMove)
    if (canMove) {
        //  读取窗口原位置，每次调用函数的时候都要获取一次
        const winPosition = mainWindow.getPosition();
        winStartPosition = {x: winPosition[0], y: winPosition[1]};
        cursorStartPosition = screen.getCursorScreenPoint();
        
        // To avoid some unforeseeable bugs, for example changing window size while draging window
        //  get window size and position
        const windowBounds = mainWindow.getBounds()
        
        if (!movingInterval) {
            //  新增计时器
            
            movingInterval = setInterval(() => {
                // 实时更新位置
                const cursorNowPosition = screen.getCursorScreenPoint();
                // 窗口移动距离就是窗口起始位置 + 鼠标当前位置和鼠标起始位置之差
                const winNewPosX = winStartPosition.x + cursorNowPosition.x - cursorStartPosition.x;
                const winNewPosY = winStartPosition.y + cursorNowPosition.y - cursorStartPosition.y;
                // 为了防止在拖动过程在中的一系列bug，类似于拖动时窗口大小改变，此处使用setBounds而非setPosition
                // mainWindow.setPosition(winNewPosX, winNewPosY, true)
                mainWindow.setBounds({
                    x: winNewPosX,
                    y: winNewPosY,
                    width: windowBounds.width,
                    height: windowBounds.height
                })
            }, 20)
        }
    }
    else{
        clearInterval(movingInterval);
        movingInterval = null;
    }
}
//  更改用户音量配置，这是临时更改，对于文件修改会在程序关闭前进行修改
function updateUserConfig(e, dataObj) {     
    for (let i = 0; i < dataObj.attrName.length; i++) {
        userConfig[dataObj.attrName[i]] = dataObj.value[i];
        
    }
}
//  监听更改用户关于音乐的一些配置的事件，这是临时更改，对于文件修改会在程序关闭前进行修改
function updateUserConfigMusic(e, dataObj) {        
    for (let i = 0; i < dataObj.attrName.length; i++) {
        userConfig.music[dataObj.attrName[i]] = dataObj.value[i];
        
    }
}
//  更改本地用户配置文件，这是正式的文件更改，在程序关闭前执行
function updateUserConfigFileBeforeClose() {     
    let jsonFilePath = path.join(__dirname,'config/user.json')
    // let writeFlag = fs.accessSync(jsonFilePath, fs.constants.W_OK)
    let userObj = {
        user: userConfig
    }
    console.log(JSON.stringify(userObj))
    fs.writeFileSync(jsonFilePath, JSON.stringify(userObj))
    
}

/**
 * 模块事件处理
 */
// 获取音乐播放列表
function getMusicList() {
    return musicLibrary.musicList;
}
// 查找音乐文件的完整路径
async function getMusicPath(event, filename) {
    for (const folder of musicLibrary.musicFolders) {
        const filePath = path.join(folder, filename);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
}
// 选择音乐文件
async function chooseMusicFile() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
}

// 选择多个音乐文件
async function chooseMusicFiles() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections', 'showHiddenFiles'],
        filters: [
            { name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths;
    }
    return [];
}

// 获取音频文件信息
async function getMusicInfo(event, filePaths) {
    try {
        let musicArr = []
        for (let i = 0; i < filePaths.length; i++) {
            // 获取文件基本信息
            const stats = fs.statSync(filePaths[i]);
            const fileName = path.basename(filePaths[i]);
            const info = await parseFile(filePaths[i]);
            console.log('歌曲meta data', info);
            // 尝试从文件名提取艺术家和标题信息
            let title = fileName;
            let artist = '未知艺术家';
            // 假设格式为 "艺术家 - 标题.扩展名"
            const match = fileName.match(/(.+)\s-\s(.+)\..+$/);
            if (match) {
                artist = match[1].trim();
                title = match[2].trim();
            }
            if(Object.hasOwn(info.common, 'title')) {
                title = info.common.title
            }
            if(Object.hasOwn(info.common, 'artist')) {
                artist = info.common.artist
            }
            // 处理封面图片
            let coverUrl = null;
            if (info.common.picture && info.common.picture.length > 0) {
                const picture = info.common.picture[0];
                const format = picture.format || 'jpeg';
                const base64Data = Buffer.from(picture.data).toString('base64');
                coverUrl = `data:image/${format};base64,${base64Data}`;
            }
            let musicInfoObj = {
                id: filePaths[i],
                path: filePaths[i],
                title: title,
                artist: artist,
                ...info.common,
                size: stats.size,
                modified: stats.mtime,
                coverUrl
            }
            musicArr.push(musicInfoObj)
        }
        return musicArr
    } catch (error) {
        console.error('获取音频信息失败:', error);
        return [];
    }
}

// 添加音乐到播放列表
function addMusicToLibrary(event, MusicList) {
    try {
            
            musicLibrary.musicList = [...MusicList]
            
            // 通知渲染进程
            if (mainWindow) {
                mainWindow.webContents.send('music-list-updated', musicLibrary.musicList);
            }
    } catch (error) {
        console.error('添加音乐到播放列表失败:', error);
    }
    return null;
}
// 从播放列表中移除歌曲
function removeFromPlaylist(event, songId) {
    const index = musicLibrary.musicList.findIndex(song => song.id === songId);
    if (index !== -1) {
        musicLibrary.musicList.splice(index, 1);
        
        // 通知渲染进程
        if (mainWindow) {
            mainWindow.webContents.send('music-list-updated', musicLibrary.musicList);
        }
    }
}
//  添加事件监听
function listenEvent() {  
    ipcMain.on('close-window', closeApp) //  shutdown application
    ipcMain.on('minimize-window', minimizeWindow)    //  listen the event for minimize application window
    ipcMain.on('maximize-window', maximizeWindow)//  listen the event for maximize or restore application window
    ipcMain.on('window-move-open', moveWin) //   listen the event for drag window
    ipcMain.on('update-userConfig', updateUserConfig)   //  监听更改用户音量配置的事件，这是临时更改，对于文件修改会在程序关闭前进行修改
    ipcMain.on('update-userconfig-music', updateUserConfigMusic)    //  监听更改用户关于音乐的一些配置的事件，这是临时更改，对于文件修改会在程序关闭前进行修改
    
    // 添加音频相关处理程序
    ipcMain.handle('get-music-list', getMusicList)  //  获取播放列表
    ipcMain.handle('get-music-file-path', getMusicPath) // 获取音乐文件路径
    ipcMain.handle('select-audio-file', chooseMusicFile); // 选择单个音频文件
    ipcMain.handle('select-music-files', chooseMusicFiles); // 选择多个音频文件
    ipcMain.handle('get-music-info', getMusicInfo); // 获取音频信息
    ipcMain.on('remove-from-playlist', (event, songId) => {
        removeFromPlaylist(event, songId);
    });
    ipcMain.on('add-music-to-library', addMusicToLibrary)
}

function createWindow() {   //  创建窗口
    const windowOptions = {
        width : 1200,
        minWidth: 1200,
        height: 700,
        minHeight: 700,
        show: false,
        frame: false,//  是否创建无边框窗口
        devTools: true,
        webPreferences: {
            preload: path.join(__dirname, 'config/preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
            webSecurity: false
        },
        icon: path.join(__dirname, 'component/icon/utaha_min.png'),
    }
    mainWindow = new BrowserWindow(windowOptions);
    mainWindow.title = 'Utaha Music';
    mainWindow.loadURL("http://localhost:3000/");
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    
    // 开发环境打开开发工具
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

function createTray() {     //  创建系统通知区图标和菜单
    let iconPath = path.join(__dirname, '/component/icon/utaha_min.png')
    let appTrayIcon = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
        { label: '设置', type: 'normal'},
        { label: '退出', type: 'normal', click: closeApp}
    ])
    appTrayIcon.setToolTip('Utaha Music');
    appTrayIcon.setContextMenu(contextMenu);
}

// 应用启动时创建窗口
app.on('ready', () => {
    createWindow();
});

// 应用准备就绪后设置协议和监听器
app.whenReady().then(() => {
    
    console.log('协议和处理程序注册完成');
    listenEvent();
    // createTray(); // 取消注释以启用系统托盘
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// 在macOS上，点击dock图标时如果没有其他窗口打开则再创建一个窗口
app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason) => {
    console.error('未处理的Promise拒绝:', reason);
});