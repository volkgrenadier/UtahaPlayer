const { parseKrcForReact } = require('../utils/krc_parser')
const lyricFileType = [
    {
        type: 'lrc'
        
    }, 
    {
        type: 'LRC'
        
    }, 
    {
        type: 'txt'
        
    },
    {
        type: 'krc',
        handler: parseKrcForReact
    },
    {
        type: 'KRC',
        handler: parseKrcForReact
    }
] // 歌词文件类型
const musicFileType = ['mp3', 'wav', 'ogg', 'flac', 'm4a'] // 音乐文件类型
module.exports = {
    lyricFileType,
    musicFileType
}