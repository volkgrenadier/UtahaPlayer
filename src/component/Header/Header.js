import React from 'react'
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import FullscreenOutlinedIcon from '@mui/icons-material/FullscreenOutlined';
import FullscreenExitOutlinedIcon from '@mui/icons-material/FullscreenExitOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import './Header.scss'

const Header = () => {
    //  功能按钮列表
    const buttons = [
        {
            label: '最小化',
            value: 'minimize-window',
            icon: <RemoveOutlinedIcon />
        },
        {
            label: '全屏',
            value: 'maximize-window',
            icon: <FullscreenOutlinedIcon />
        },
        {
            label: '关闭',
            value: 'close-window',
            icon: <CloseOutlinedIcon />
        },
    ]

    //  按钮点击事件
    const handleClick = (type, data) => {
        if (!type) {
            return;
        }
        window.electronFeatures.sendMessage(type, data)
    }
    return (
        <div className='Header_container'>
            <div className="Header_info_container">
                <div className="Header_info_logo_container"></div>
                <div className="Header_info_title_container">Utaha Player</div>
            </div>
            <div className="Header_buttons_container">
                {
                    buttons.map((it, ind) => (
                        <div 
                            className="Header_button"
                            key={it.value}
                            onClick={() => {handleClick(it.value)}}
                        >
                            {
                                it.icon
                            }
                        </div>
                    ))
                }
            </div>
            
        </div>
    )
}

export default Header