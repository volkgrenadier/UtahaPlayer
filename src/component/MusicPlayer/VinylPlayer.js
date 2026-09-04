import React from 'react'
import './VinylPlayer.scss'

const VinylPlayer = ({
    isPlaying = false,
    labelColor = '#9d2f5c',
    coverImage = null,
    onTogglePlay = null,
    className = '',
    style = {},
}) => {
    const interactive = typeof onTogglePlay === 'function'
    const handleKeyDown = (event) => {
        if (!interactive || (event.key !== 'Enter' && event.key !== ' ')) return
        event.preventDefault()
        onTogglePlay()
    }

    return (
        <div
            className={`VinylPlayer_container${isPlaying ? ' is-playing' : ''}${className ? ` ${className}` : ''}`}
            role={interactive ? 'button' : 'img'}
            tabIndex={interactive ? 0 : -1}
            aria-label={interactive ? (isPlaying ? '暂停唱片播放' : '开始唱片播放') : 'Utaha 唱片播放视觉'}
            onClick={interactive ? onTogglePlay : undefined}
            onKeyDown={handleKeyDown}
            style={{ '--vinyl-label': labelColor, ...style }}
        >
            <div className="VinylPlayer_ambient" aria-hidden="true" />
            <div className="VinylPlayer_stage">
                <div className="VinylPlayer_caption">
                    <span className="VinylPlayer_eyebrow">UTAHA ANALOG MODE</span>
                    <strong>{isPlaying ? '唱针已经落下' : '等待下一段旋律'}</strong>
                    <span className="VinylPlayer_state">
                        <i aria-hidden="true" />
                        {isPlaying ? 'PLAYING · 33⅓ RPM' : 'PAUSED · 33⅓ RPM'}
                    </span>
                </div>

                <div className="VinylPlayer_deck" aria-hidden="true">
                    <span className="VinylPlayer_deckBrand">U / 01</span>
                    <div className="VinylPlayer_platter" />
                    <div className="VinylPlayer_record" data-testid="vinyl-record">
                        <span className="VinylPlayer_recordShine" />
                        <span className="VinylPlayer_label">
                            {coverImage
                                ? <img src={coverImage} alt="" data-testid="vinyl-cover" />
                                : (
                                    <span className="VinylPlayer_monogram">
                                        <b>U</b>
                                        <i><span /><span /><span /><span /></i>
                                    </span>
                                )}
                        </span>
                        <span className="VinylPlayer_spindle" />
                    </div>

                    <div className="VinylPlayer_tonearm">
                        <span className="VinylPlayer_counterweight" />
                        <span className="VinylPlayer_pivot" />
                        <span className="VinylPlayer_arm" />
                        <span className="VinylPlayer_head" />
                    </div>

                    <div className="VinylPlayer_speedControl">
                        <span className="VinylPlayer_statusLight" />
                        <span>33</span>
                        <span>45</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VinylPlayer
