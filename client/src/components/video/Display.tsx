import React, { RefObject } from "react"

interface DisplayProps {
    displayName: string
    videoRef: RefObject<HTMLVideoElement>
    style?: React.CSSProperties
}

const Display: React.FC<DisplayProps> = ({ displayName, videoRef, style }) => {
    return (
        <div style={style}>
            <div style={{ textAlign: "center" }}>{displayName}</div>
            <div style={{ height: "200px", width: "96%", margin: "0px auto" }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%" }}
                />
            </div>
        </div>
    )
}

export default Display
