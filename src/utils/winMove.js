const { screen } = require("electron")
function moveWindow(canMove,mainWindow) {   //  移动窗口
    let winStartPosition = {x: 0, y: 0};
    let cursorStartPosition = {x: 0, y: 0};
    let movingInterval = null;
    if (canMove) {
        //  读取原位置
        const winPosition = mainWindow.getPosition();
        winStartPosition = {x: winPosition[0], y: winPosition[1]};
        cursorStartPosition = screen.getCursorScreenPoint();
        
        //  清除计时器
        if (movingInterval) {
            clearInterval(movingInterval)
        }
        //  新增计时器
        movingInterval = setInterval(() => {
            // 实时更新位置
            const cursorNowPosition = screen.getCursorScreenPoint();
            const winNewPosX = winStartPosition.x + cursorNowPosition.x - cursorStartPosition.x;
            const winNewPosY = winStartPosition.y + cursorNowPosition.y - cursorStartPosition.y;
            mainWindow.setPosition(winNewPosX, winNewPosY, true)
        }, 20)
            
    }
    else{
        clearInterval(movingInterval);
        movingInterval = null;
    }
}

module.exports = moveWindow;