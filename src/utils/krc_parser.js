/**
 * KRC解析器模块 - 解析酷狗音乐KRC歌词文件
 * 可直接导入到Electron或其他Node.js项目中使用
 */

const fs = require('fs');
const zlib = require('zlib');
const { promisify } = require('util');

// 将回调式API转换为Promise
const inflateAsync = promisify(zlib.inflate);
const readFileAsync = promisify(fs.readFile);

class KrcParser {
    // KRC加密密钥（这是公开已知的）
    static krcEncryptionKey = [
        64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105
    ];

    /**
   * 解析KRC文件并返回LRC格式的歌词数组
   * @param {string} filePath KRC文件路径
   * @returns {Promise<Object>} 包含歌曲信息和歌词数组的对象
   */
    static async parseLyrics(filePath) {
        try {
        // 解密并解压KRC文件内容
        const krcContent = await this.decryptAndDecompressKrc(filePath);
        
        // 解析歌词内容
        const parsedLyrics = this.parseKrcContent(krcContent);
        
        // 转换为LRC格式的歌词数组
        const lrcArray = this.convertToLrcArray(parsedLyrics);
        
        return {
            success: true,
            lyricPath: filePath,
            info: parsedLyrics.info,   // 歌曲信息
            lyricStrData: lrcArray           // LRC格式的歌词数据
        };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                lyricPath: filePath,
                info: {},
                lyricStrData: ''
            };
        }
    }
  
  /**
   * 解密并解压KRC文件
   * @param {string} filePath KRC文件路径
   * @returns {Promise<string>} 解密和解压后的内容
   */
    static async decryptAndDecompressKrc(filePath) {
        // 读取KRC文件
        const fileBuffer = await readFileAsync(filePath);
        
        // 查找KRC头部后的正确起始位置
        let startOffset = this.findKrcHeaderOffset(fileBuffer);
        
        if (startOffset === -1) {
            throw new Error('无效的KRC文件格式：找不到头部标识');
        }
        
        // 提取加密内容
        const encryptedContent = fileBuffer.slice(startOffset);
        
        // 解密内容
        const decryptedContent = this.decryptKrc(encryptedContent);
        
        // 解压内容（KRC文件使用zlib压缩）
        return await this.decompressContent(decryptedContent);
    }
  
  /**
   * 查找KRC文件头部偏移量
   * @param {Buffer} buffer KRC文件缓冲区
   * @returns {number} 头部之后的偏移量，如果找不到则返回-1
   */
    static findKrcHeaderOffset(buffer) {
        // 检查常见的头部格式
        if (buffer.toString('ascii', 0, 4) === 'krc1') {
            return 4;
        }
        
        // 搜索"krc1"标识
        for (let i = 0; i < 100; i++) {
            if (buffer[i] === 0x6B && buffer[i + 1] === 0x72 && 
                buffer[i + 2] === 0x63 && buffer[i + 3] === 0x31) { // "krc1" in ASCII
                return i + 4;
            }
        }
        
        return -1;
    }
  
  /**
   * 使用XOR加密密钥解密KRC内容
   * @param {Buffer} encryptedBuffer 加密的内容
   * @returns {Buffer} 解密后但仍然压缩的内容
   */
    static decryptKrc(encryptedBuffer) {
        const decryptedBuffer = Buffer.alloc(encryptedBuffer.length);
        
        for (let i = 0; i < encryptedBuffer.length; i++) {
        // 使用XOR密钥对每个字节进行解密
            decryptedBuffer[i] = encryptedBuffer[i] ^ this.krcEncryptionKey[i % this.krcEncryptionKey.length];
        }
        
        return decryptedBuffer;
    }
  
  /**
   * 使用zlib解压内容
   * @param {Buffer} compressedBuffer 压缩的内容
   * @returns {Promise<string>} 解压后的内容字符串
   */
    static async decompressContent(compressedBuffer) {
        try {
            const result = await inflateAsync(compressedBuffer);
            return result.toString();
        } catch (error) {
            throw new Error(`解压缩内容失败: ${error.message}`);
        }
    }
  
  /**
   * 解析KRC内容
   * @param {string} krcContent 解密和解压后的KRC内容
   * @returns {Object} 包含歌曲信息和歌词的对象
   */
    static parseKrcContent(krcContent) {
        const lines = krcContent.split('\n');
        const lyrics = [];
        const infoLines = [];
        
        for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('[')) {
                // 处理信息行，如[ar:歌手]或[ti:标题]
                if (!line.includes('<') && line.includes(':')) {
                    infoLines.push(line);
                    continue;
                }
                
                // 处理带有时间标签的歌词行
                const lyricObj = this.parseLyricLine(line);
                lyrics.push(lyricObj);
            } else {
                // 处理普通文本行
                lyrics.push({
                    content: line,
                    startTime: 0,
                    endTime: 0,
                    wordTags: []
                });
            }
        }
        
        return {
            info: this.parseInfoLines(infoLines),
            lyrics: lyrics
        };
    }
  
  /**
   * 解析单行歌词
   * @param {string} line 歌词行
   * @returns {Object} 解析后的歌词对象
   */
    static parseLyricLine(line) {
        // 提取歌词内容（不包括时间标签）
        const contentMatch = line.match(/\]([^\[]*)/);
        const mainContent = contentMatch ? contentMatch[1] : '';
        
        // 提取行开始时间
        const timeMatch = line.match(/\[(\d+),\d+(?:,\d+)?\]/);
        const startTime = timeMatch ? parseInt(timeMatch[1], 10) : 0;
        
        // 提取行结束时间（使用最后一个词的结束时间）
        const wordTagRegex = /\[(\d+),(\d+)(?:,(\d+))?\]/g;
        let lastEndTime = startTime;
        const wordTags = [];
        let match;
        
        // 提取所有单词时间标签
        while ((match = wordTagRegex.exec(line)) !== null) {
            const wordStartTime = parseInt(match[1], 10);
            const wordDuration = parseInt(match[2], 10);
            const wordEndTime = wordStartTime + wordDuration;
            
            // 可选的跳词标记
            const skipType = match[3] ? parseInt(match[3], 10) : 0;
            
            if (wordEndTime > lastEndTime) {
                lastEndTime = wordEndTime;
            }
            
            wordTags.push({
                time: wordStartTime,  // 单词开始时间
                duration: wordDuration, // 单词持续时间
                skipType: skipType     // 跳词标记（0表示普通，1表示跳过）
            });
        }
        
        return {
            content: mainContent,    // 歌词文本内容
            startTime: startTime,    // 行开始时间（毫秒）
            endTime: lastEndTime,    // 行结束时间（毫秒）
            wordTags: wordTags       // 单词级时间标签数组
        };
    }

    /**
     * 解析信息行
     * @param {string[]} infoLines 信息行数组
     * @returns {Object} 解析后的信息对象
     */
    static parseInfoLines(infoLines) {
        const info = {};
        
        for (const line of infoLines) {
        const match = line.match(/\[([^:]+):([^\]]+)\]/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            info[key] = value;
        }
        }
        
        return info;
    }
  
  /**
   * 转换为LRC格式的歌词数组
   * @param {Object} parsedKrc 解析后的KRC内容
   * @returns {Array} LRC格式的歌词数组
   */
    static convertToLrcArray(parsedKrc) {
        const { lyrics } = parsedKrc;
        const lrcArray = [];
        
        // 过滤掉没有有效时间标签的行
        for (const line of lyrics) {
            if (line.startTime > 0) {
                // 将时间从毫秒转换为秒
                const timeInSeconds = line.startTime / 1000;
                const minutes = Math.floor(timeInSeconds / 60);
                const seconds = timeInSeconds % 60;
                
                // 格式化时间为[mm:ss.xx]
                const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
                
                lrcArray.push({
                    time: line.startTime,    // 原始时间（毫秒）
                    timeStr: formattedTime,  // 格式化时间字符串
                    text: line.content,      // 歌词文本
                    words: this.extractWordTimings(line) // 单词级时间信息
                });
            }
        }
        
        // 按时间排序
        return lrcArray.sort((a, b) => a.time - b.time);
    }
  
  /**
   * 提取单词级时间信息
   * @param {Object} line 解析后的歌词行
   * @returns {Array} 单词时间数组
   */
    static extractWordTimings(line) {
        if (!line.wordTags || line.wordTags.length === 0) {
            return [];
        }
        
        // 计算每个单词标签应该对应的字符数
        // KRC没有明确指出每个标签对应哪些字符，需要估算
        const wordCount = line.wordTags.length;
        const textLength = line.content.length;
        const wordsArray = [];
        
        // 如果没有足够的字符，返回空数组
        if (textLength === 0) {
            return [];
        }
        
        // 估算每个标签应对应的平均字符数
        const avgCharsPerTag = Math.ceil(textLength / wordCount);
        
        let charIndex = 0;
        for (let i = 0; i < wordCount; i++) {
            const tag = line.wordTags[i];
            
            // 计算当前标签应该对应的字符数
            let charsForThisTag = avgCharsPerTag;
            
            // 确保不会超出字符串边界
            if (charIndex + charsForThisTag > textLength) {
                charsForThisTag = textLength - charIndex;
            }
            
            // 如果是最后一个标签，那么获取剩余所有字符
            if (i === wordCount - 1) {
                charsForThisTag = textLength - charIndex;
            }
            
            // 提取对应的文本
            const wordText = line.content.substr(charIndex, charsForThisTag);
            charIndex += charsForThisTag;
            
            if (wordText) {
                wordsArray.push({
                text: wordText,
                time: tag.time,
                duration: tag.duration,
                skipType: tag.skipType
                });
            }
        }
        
        return wordsArray;
    }
  
  /**
   * 保存为LRC文件
   * @param {string} outputPath 输出文件路径
   * @param {Object} parsedKrc 解析后的KRC内容
   * @returns {Promise<boolean>} 是否保存成功
   */
    static async saveAsLrc(outputPath, parsedKrc) {
        try {
            const { info, lyrics } = parsedKrc;
            let lrcContent = '';
            
            // 添加信息标签
            for (const [key, value] of Object.entries(info)) {
                lrcContent += `[${key}:${value}]\n`;
            }
            
            // 添加时间戳和歌词
            for (const line of lyrics) {
                if (line.startTime > 0) {
                    const timeInSeconds = line.startTime / 1000;
                    const minutes = Math.floor(timeInSeconds / 60);
                    const seconds = timeInSeconds % 60;
                    
                    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
                    lrcContent += `[${formattedTime}]${line.content}\n`;
                }
            }
            
            // 写入文件
            await fs.promises.writeFile(outputPath, lrcContent, 'utf8');
            return true;
        } catch (error) {
            console.error('保存LRC文件失败:', error);
            return false;
        }
    }
}

/**
 * 解析KRC文件并返回React组件可用的歌词数组
 * @param {string} filePath KRC文件路径
 * @returns {Promise<Object>} 包含歌曲信息和歌词数组的对象
 */
async function parseKrcForReact(filePath) {
    try {
        console.log('收到的路径:', filePath);
        return await KrcParser.parseLyrics(filePath);
    } catch (error) {
        console.error('解析KRC文件失败:', error);
        return {
            success: false,
            error: error.message,
            lyricPath: filePath,
            info: {},
            lyricStrData: ''
        };
    }
}

// 导出函数和类
module.exports = {
  parseKrcForReact,
  KrcParser
};