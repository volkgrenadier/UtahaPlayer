const { ipcRenderer } = require("electron")
/**
 * 封装的窗口移动
 * @param {boolean} canMove
 */

const winControl = {
    windowMove: (canMove) => ipcRenderer.send('window-move-open', canMove)
}

export default winControl;