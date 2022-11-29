import React,{ useRef, useState} from 'react'
import styles from './audio.module.scss'
const Audio = () => {
    const audioRef = useRef();
    const [playStatus, setPlayStatus] = useState(false)
    // audioRef.current.volume = 0.3;
    const play = () => {
        if (audioRef.paused) {
            audioRef.current.play()
        }
        else{
            audioRef.current.pause();
        }
        setPlayStatus(!playStatus)
        console.log(audioRef)
        console.log(audioRef.current.duration)
        console.log(audioRef.current.currentTime)
    }
    return (
        <div className={styles.audio_container}>
            <audio id='audio_audio' ref={audioRef}></audio>
            <div className={styles.audio_button_container}>
                <button className={styles.audio_button} id={styles.audio_button_piror} title='上一首'></button>
                <button className={styles.audio_button} id={playStatus ? styles.audio_button_pause : styles.audio_button_play} onClick={play} title={playStatus? '暂停' : '开始'}></button>
                <button className={styles.audio_button} id={styles.audio_button_next} title='下一首'></button>
            </div>
            <div className={styles.audio_controlPannel_container}>
                <button className={`${styles.audio_controlPannel_button} ${styles.audio_controlPannel_button_volume_low}`} id={styles.audio_controlPannel_button_volume} title='音量'></button>
                <button className={styles.audio_controlPannel_button} id={styles.audio_controlPannel_sequence} title='播放列表'></button>
                <div className={styles.audio_controlPannel_volumeSlider_container}>
                    <div className={styles.audio_controlPannel_volumeSlider_Triangle}></div>
                </div>
            </div>
        </div>
    )
}

export default Audio