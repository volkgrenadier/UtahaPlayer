import React from 'react'

const DragWindow = (props) => {
    const { ipcRenderer } = window.require("electron")
    const windowMove = (canMove) => ipcRenderer.send('window-move-open', canMove)
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