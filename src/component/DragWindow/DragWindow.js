import React, { useCallback, useRef } from 'react'

const DragWindow = (props) => {
    const isDragging = useRef(false);
    
    const windowMove = useCallback((canMove) => {
        if (isDragging.current !== canMove) {
            isDragging.current = canMove;
            window.electronFeatures.sendMessage('window-move-open', canMove);
        }
    }, []);
    
    const onMouseDown = useCallback((e) => {
        if (e.target instanceof HTMLDivElement) {
            windowMove(true);
        }
    }, [windowMove]);
    
    const onMouseUp = useCallback(() => {
        windowMove(false);
    }, [windowMove]);
    return (
        <div 
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        style={{ WebkitAppRegion: 'no-drag' }} // 禁用默认拖动
    >
        {props.children}
    </div>
    )
}

export default DragWindow