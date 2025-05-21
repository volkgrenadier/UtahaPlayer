const { parseKrcForReact } = require('../utils/krc_parser')
/**
 * @description: 音乐文件类型
 * @type {Array}
 * @item {Object}
 *      @item.type {String} 文件类型
 *      @item.handler {Function} 解析函数
 */
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
] 
/**
 * @description: 音乐文件类型
 * @type {Array}
 */
const musicFileType = ['mp3', 'wav', 'ogg', 'flac', 'm4a']
module.exports = {
    lyricFileType,
    musicFileType
}