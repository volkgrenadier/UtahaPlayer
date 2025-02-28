import React from 'react'

const DragWindow = (props) => {
    const windowMove = (canMove) => window.electronFeatures.sendMessage('window-move-open', canMove)
    const onMouseDown = (e) => {
        if (e.target instanceof HTMLDivElement) {
            windowMove(true)
        }
        else{
            windowMove(false)
        }
    }

    return (
        <div 
            onMouseDown={ onMouseDown }
            onMouseUp = {() => windowMove(false)}
        >
            {props.children}
        </div>
    )
}

export default DragWindow