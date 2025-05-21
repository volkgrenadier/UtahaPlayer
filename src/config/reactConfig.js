/**
 * @description: reactConfig，此文件是react的配置文件
 * @why: 为什么设置此文件？它与config.js有什么区别？
 *      1. config.js是主进程部分（Electron）的配置文件，reactConfig.js是react的配置文件
 *      2. 分开设置的原因：由于ELectron主进程运行在Node.js环境中，而React运行在浏览器环境中，所以它们在导入、导出方式等方面有区别
 */


/**
 * @description: 通知持续时间
 */
export const NOTIFYDURATION = 2000
export const MAXVOLUME = 60