import React from 'react';

interface DisplayProps {
    displayName: string
    videoRef: React.RefObject<HTMLVideoElement>
    style?: React.CSSProperties
}

const Display: React.FC<DisplayProps> = ({ displayName, videoRef, style }) => {
    return (
        <div className="flex flex-col items-center" style={style}>
            <div className="relative w-full">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={displayName.includes('(self)')}
                    className="w-full rounded-lg bg-darkHover"
                />
                <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-sm text-white">
                    {displayName}
                </div>
            </div>
        </div>
    )
}

export default Display
