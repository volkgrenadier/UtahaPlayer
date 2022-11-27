// const moveWindow = require('./utils/winMove');
const {app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow = null;
let movingInterval = null;
function closeApp() {   //  关闭app
    app.quit()
}
function minimizeWindow() { //  最小化窗口
    mainWindow.minimize();
    console.log("最小化窗口")
}
function maximizeWindow() { //  最大化窗口
    if (mainWindow.isMaximized()) {
        mainWindow.restore();
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



function listenEvent() {  //  添加事件监听
    ipcMain.on('close-window',closeApp) //  shutdown application
    // ipcMain.on('closed',() => {
    //     mainWindow = null;
    // })
    ipcMain.on('minimize-window',minimizeWindow)    //  listen the event for minimize application window
    ipcMain.handle('maximize-window',maximizeWindow)//  listen the event for maximize or restore application window
    ipcMain.on('window-move-open',moveWin) 
    
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
        icon:path.join(__dirname,'/icon/utaha_min.png'),
    }
    mainWindow = new BrowserWindow(windowOptions);
    mainWindow.title = 'Utaha Music';
    // mainWindow.setIcon();
    mainWindow.loadURL("http://localhost:3000/");
    mainWindow.once('ready-to-show',() => {
        mainWindow.show();
        
    })
    
    
}



app.on('ready',() => {
    createWindow();
    
})
app.whenReady().then(() => {
    
    console.log('ready')
    listenEvent();
})
