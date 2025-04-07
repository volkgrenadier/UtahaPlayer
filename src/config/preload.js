const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// 将electron API暴露给渲染进程
contextBridge.exposeInMainWorld('electronFeatures', {
    // 选择音频文件
    selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
    
    // 获取音频信息
    getAudioInfo: (filePath) => ipcRenderer.invoke('get-audio-info', filePath),
    
    // 发送消息到主进程
    sendMessage: (channel, data) => {
        if (!channel) {
            console.warn('消息类型不可缺少');
            return;
        }
        return ipcRenderer.send(channel, data);
    },
    
    // 添加接收主进程消息的功能
    onMessage: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
        
        // 返回一个清理函数，用于移除监听器
        return () => {
        ipcRenderer.removeAllListeners(channel);
        };
    },
    
    // 获取音乐列表
    getMusicList: () => ipcRenderer.invoke('get-music-list'),
});

// 为开发环境添加热重载支持
// if (process.env.NODE_ENV === 'development') {
//     window.addEventListener('message', (event) => {
//         if (event.data === 'reload-page') {
//             window.location.reload();
//         }
//     });
// }

// // 添加错误处理
// window.addEventListener('error', (event) => {
//     console.error('渲染进程错误:', event.error);
//     ipcRenderer.send('renderer-error', {
//         message: event.error.message,
//         stack: event.error.stack
//     });
// });

// // 添加未捕获的Promise拒绝处理
// window.addEventListener('unhandledrejection', (event) => {
//     console.error('未处理的Promise拒绝:', event.reason);
//     ipcRenderer.send('renderer-unhandled-rejection', {
//         message: event.reason?.message || String(event.reason),
//         stack: event.reason?.stack || 'No stack trace available'
//     });
// });

console.log('Preload script has been loaded');