const { app, BrowserWindow, ipcMain, screen, Tray, Menu} = require('electron');
const path = require('path');
const fs = require('fs');
const userLocalConfig = require('./config/user.json')

let mainWindow = null;
let movingInterval = null;
let userConfig = userLocalConfig.user;    //  用户配置



function closeApp() {   //  关闭app
    updateUserConfigFileBeforeClose()   //  关闭程序前写入文件
    app.quit()
}
function minimizeWindow() { //  最小化窗口
    mainWindow.minimize();
    console.log("最小化窗口")
}
function maximizeWindow() { //  最大化窗口
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        return true     //  true means window has been restored, for Header.js
    }
    else{
        mainWindow.maximize();
        return false    //  false means window has been maximized, for Header.js
    }
}



function moveWin(e,canMove) {    //  移动窗口，
    let winStartPosition = {x: 0, y: 0};
    let cursorStartPosition = {x: 0, y: 0};
    
    // console.log(canMove)
    if (canMove) {
        //  读取窗口原位置，每次调用函数的时候都要获取一次
        const winPosition = mainWindow.getPosition();
        winStartPosition = {x: winPosition[0], y: winPosition[1]};
        cursorStartPosition = screen.getCursorScreenPoint();
        
        //  清除之前的计时器
        // if (movingInterval) {
        //     clearInterval(movingInterval)
        // }
        // //  新增计时器
        // movingInterval = setInterval(() => {
        //     // 实时更新位置
        //     const cursorNowPosition = screen.getCursorScreenPoint();
        //     // 窗口移动距离就是窗口起始位置 + 鼠标当前位置和鼠标起始位置之差
        //     const winNewPosX = winStartPosition.x + cursorNowPosition.x - cursorStartPosition.x;
        //     const winNewPosY = winStartPosition.y + cursorNowPosition.y - cursorStartPosition.y;
        //     mainWindow.setPosition(winNewPosX, winNewPosY, true)
        // }, 5)
        
        if (!movingInterval) {
            //  新增计时器
            
            movingInterval = setInterval(() => {
                // 实时更新位置
                const cursorNowPosition = screen.getCursorScreenPoint();
                // 窗口移动距离就是窗口起始位置 + 鼠标当前位置和鼠标起始位置之差
                const winNewPosX = winStartPosition.x + cursorNowPosition.x - cursorStartPosition.x;
                const winNewPosY = winStartPosition.y + cursorNowPosition.y - cursorStartPosition.y;
                mainWindow.setPosition(winNewPosX, winNewPosY, true)
            }, 5)
        }
        
        
            
    }
    else{
        clearInterval(movingInterval);
        movingInterval = null;
    }
}
function updateUserConfig(e, dataObj) {     //  更改用户音量配置，这是临时更改，对于文件修改会在程序关闭前进行修改
    for (let i = 0; i < dataObj.attrName.length; i++) {
        userConfig[dataObj.attrName[i]] = dataObj.value[i];
        
    }
}
function updateUserConfigMusic(e, dataObj) {        //  监听更改用户关于音乐的一些配置的事件，这是临时更改，对于文件修改会在程序关闭前进行修改
    for (let i = 0; i < dataObj.attrName.length; i++) {
        userConfig.music[dataObj.attrName[i]] = dataObj.value[i];
        
    }
}
function updateUserConfigFileBeforeClose() {     //  更改本地用户配置文件，这是正式的文件更改，在程序关闭前执行
    let jsonFilePath = path.join(__dirname,'config/user.json')
    // let writeFlag = fs.accessSync(jsonFilePath, fs.constants.W_OK)
    let userObj = {
        user: userConfig
    }
    console.log(JSON.stringify(userObj))
    fs.writeFileSync(jsonFilePath, JSON.stringify(userObj))
    
}


function listenEvent() {  //  添加事件监听
    ipcMain.on('close-window',closeApp) //  shutdown application
    // ipcMain.on('closed',() => {
    //     mainWindow = null;
    // })
    ipcMain.on('minimize-window', minimizeWindow)    //  listen the event for minimize application window
    ipcMain.handle('maximize-window', maximizeWindow)//  listen the event for maximize or restore application window
    ipcMain.on('window-move-open', moveWin) //   listen the event for drag window
    ipcMain.on('update-userConfig', updateUserConfig)   //  监听更改用户音量配置的事件，这是临时更改，对于文件修改会在程序关闭前进行修改
    ipcMain.on('update-userconfig-music', updateUserConfigMusic)    //  监听更改用户关于音乐的一些配置的事件，这是临时更改，对于文件修改会在程序关闭前进行修改
    
}

function createWindow() {   //  创建窗口
    const windowOptions = {
        width : 1200,
        minWidth: 1200,
        height: 900,
        minHeight: 900,
        show: false,
        frame: false,//  是否创建无边框窗口
        webPreferences: {
            nodeIntegration: true,
            contextIsolation : false,
        },
        icon:path.join(__dirname,'component/icon/utaha_min.png'),
    }
    mainWindow = new BrowserWindow(windowOptions);
    mainWindow.title = 'Utaha Music';
    // mainWindow.setIcon();
    mainWindow.loadURL("http://localhost:3000/");
    mainWindow.once('ready-to-show',() => {
        mainWindow.show();
        
    })
    
    
}
function createTray() {     //  创建系统通知区图标和菜单----建议最后改为BrowserWindow实现
    let iconPath = path.join(__dirname,'/component/icon/utaha_min.png')
    let appTrayIcon = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
        { label: '设置', type: 'normal'},
        { label: '退出', type: 'normal'}
    ])
    appTrayIcon.setToolTip('Utaha Music');
    appTrayIcon.setContextMenu(contextMenu);
}



app.on('ready',() => {
    createWindow();
    
})
app.whenReady().then(() => {
    
    console.log('ready')
    createTray();
    listenEvent();
})
