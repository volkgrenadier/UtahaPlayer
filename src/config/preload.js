const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'electronFeatures',
    {
        sendMessage: (type, data) => {
            if (!type) {
                console.warn('消息类型不可缺少')
                return;
            }
            return ipcRenderer.send(type, data)
        }
    }
)