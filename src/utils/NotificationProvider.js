import React, { createContext, useContext, useState }from 'react'
import { Snackbar, Popover, Box } from '@mui/material'
import { NOTIFYDURATION } from '../config/reactConfig'
import '../style/Notification.scss'


const notificationContext = createContext()
export const NotificationProvider = ({children}) => {
    
    // 通知列表
    const [notifications, setNotifications] = useState([])
    // 当前通知类型
    const [currentNoficationType, setCurrentNotificationType] = useState('')
    const [notificationOpen, setNotificationsOpen] = useState(false)
    const [anchorEl, setAnchorEl] = React.useState(null);
    /**
     * @description 添加通知
     * @param {string} message 消息内容
     * @param {string} messageType 消息类型：'info', 'success', 'warning', 'error'
     * @param {number} duration 通知持续时间，单位为毫秒
     */
    const addNotification = (message, messageType = 'info', duration) => {
        const newNotification = {
            id: Date.now(),
            type: 'notification',
            messageType,
            message,
            duration: duration || NOTIFYDURATION // 默认持续时间
        }
        setCurrentNotificationType('notification')
        setNotifications((prev) => [...prev, newNotification])
        setNotificationsOpen(true)
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id))
            setNotificationsOpen(false)
        }, newNotification.duration)
    }
    /**
     * @description: 关闭通知
     * @param {string} id 
     */
    const closeNotification = (id) => {
        setCurrentNotificationType('')
        setNotifications((prev) => prev.filter((it) => it.id !== id))
        setNotificationsOpen(false)
    }
    /**
     * @description: 添加弹出框
     * @param {string} content 弹出框内容
     * @param {function} onConfirm 确认回调函数
     * @param {function} onCancel 取消回调函数
     */
    const addInfoPopover = (
        e,
        message, 
        buttonsConfig = {
            confirmText: '确定',
            cancelText: '取消',
            onConfirm: () => {},
            onCancel: () => {}
        }
    ) => {
        const newNotification = {
            id: Date.now(),
            type: 'popover',
            messageType: 'info',
            message,
            onConfirm: buttonsConfig.onConfirm,
            onCancel: buttonsConfig.onCancel,
            confirmText: buttonsConfig.confirmText,
            cancelText: buttonsConfig.cancelText
        }
        setCurrentNotificationType('popover')
        setAnchorEl(e.currentTarget)
        setNotifications((prev) => [...prev, newNotification])
        setNotificationsOpen(true)
    }
    /**
     * @description: 关闭弹出框
     * @param {string} id 
     */
    const closePopover = (id) => {
        setCurrentNotificationType('')
        setNotifications((prev) => prev.filter((it) => it.id !== id))
        setNotificationsOpen(false)
        setAnchorEl(null)
    }
    const notify = {
        info: (message, duration) => addNotification(message, 'info', duration),
        success: (message, duration) => addNotification(message, 'success', duration),
        warning: (message, duration) => addNotification(message, 'warning', duration),
        error: (message, duration) => addNotification(message, 'error', duration),
        regularNotify: {
            info: (message, duration) => addNotification(message, 'info', duration)
        },
        popoverNotify: {
            info: (e, message, buttonsConfig) => addInfoPopover(e, message, buttonsConfig)
        }
    }
    return (
        <notificationContext.Provider 
            value={{
                notify,
                notificationOpen,
                currentNoficationType
            }}
        >
            { children }
            {
                notifications.map((it) => {
                    if (it.type === 'notification') {
                        return (
                            <Snackbar
                                key={it.id}
                                open={notificationOpen}
                                message={it.message}
                                autoHideDuration={it.duration}
                                onClose={() => closeNotification(it.id)}
                                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                                ContentProps={{
                                    sx: {
                                        backgroundColor: it.messageType === 'error' ? '#f44336' : 
                                                       it.messageType === 'success' ? '#4caf50' :
                                                       it.messageType === 'warning' ? '#ff9800' : '#2196f3',
                                        color: 'white',
                                        fontWeight: 500
                                    }
                                }}
                            />
                        )
                    } else {
                        return (
                            <Popover 
                                key={it.id}
                                open={notificationOpen}
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'right',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                            >
                                <Box 
                                    className='Notification_popover_message'
                                    sx={{
                                        pt: 1,
                                        pb: 1,
                                        pl: 2,
                                        pr: 2,
                                    }}
                                >
                                    { it.message }
                                </Box>
                                <Box 
                                    className='Notification_popover_buttons_container'
                                    sx={{
                                        pb: 1,
                                        mr: 1
                                    }}
                                >
                                    <button 
                                        className='Notification_popover_button_comfirm' 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            it.onConfirm()
                                            closePopover(it.id)   
                                        }}
                                    >
                                        {
                                            it.confirmText
                                        }
                                    </button>
                                    <button className='Notification_popover_button_cancel' 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            it.onCancel()
                                            closePopover(it.id)
                                        }}
                                    >
                                        {
                                            it.cancelText
                                        }
                                    </button>
                                </Box>
                            </Popover>
                        )
                    }
                })
            }
        </notificationContext.Provider>
    )
}

/**
 * @description: useNotification 自定义 Hook，用于在函数组件中使用通知功能
 * @returns {Object} notify 包含通知方法
 * @returns {Function} notify.info 显示常规通知
 */
export const useNotification = () => {
    const context = useContext(notificationContext)
    if(!context) {
        throw new Error('useNotification 必须在 NotificationProvider 内部使用')

    }
    return context
}