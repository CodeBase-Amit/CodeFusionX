import useResponsive from "@/hooks/useResponsive"
import { useMediasoup } from "@/context/MediasoupContext"
import Display from "@/components/video/Display" // Adjust path as needed
import { useEffect } from "react"
import { IoMicOff, IoMic, IoVideocamOff, IoVideocam, IoCall, IoCallOutline } from "react-icons/io5"

const VideoChatView = () => {
    const { viewHeight } = useResponsive()
    const {
        isConnected,
        peers,
        localVideoRef,
        startVideoChat,
        stopVideoChat,
        toggleMute,
        toggleVideo,
        isAudioEnabled,
        isVideoEnabled
    } = useMediasoup()

    // Auto-start video chat when component mounts
    useEffect(() => {
        if (!isConnected) {
            startVideoChat()
        }

        return () => {
            // Consider whether to auto-disconnect when component unmounts
            // stopVideoChat()
        }
    }, [isConnected, startVideoChat])

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-4 p-4"
            style={{ height: viewHeight }}
        >
            <div className="flex items-center justify-between">
                <h1 className="view-title">Video Chat</h1>
                <div className="text-sm text-gray-400">
                    {isConnected 
                        ? `Connected: ${peers.length + 1} participant${peers.length === 0 ? '' : 's'}`
                        : "Connecting..."}
                </div>
            </div>

            {/* Local video feed */}
            <div className="flex-shrink-0">
                <Display
                    displayName="You (self)"
                    videoRef={localVideoRef}
                    style={{
                        border: "2px solid #3a3a3a",
                        borderRadius: "8px",
                        padding: "4px",
                        background: "#1f1f1f"
                    }}
                />
            </div>

            {/* Remote video feeds */}
            {peers.length > 0 ? (
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {peers.map((peer) => (
                            <Display
                                key={peer.id}
                                displayName={peer.displayName}
                                videoRef={peer.videoRef}
                                style={{
                                    border: "1px solid #3a3a3a",
                                    borderRadius: "8px",
                                    padding: "4px",
                                    background: "#1f1f1f"
                                }}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg bg-darkHover/30 text-gray-400">
                    <p>No other participants yet</p>
                </div>
            )}

            {/* Controls */}
            <div className="flex justify-center gap-4 pt-2">
                <button
                    className={`rounded-full p-3 ${
                        isConnected ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                    } text-white`}
                    onClick={isConnected ? stopVideoChat : startVideoChat}
                >
                    {isConnected ? <IoCall size={24} /> : <IoCallOutline size={24} />}
                </button>
                <button
                    className={`rounded-full p-3 ${
                        isAudioEnabled ? "bg-gray-600 hover:bg-gray-700" : "bg-red-600 hover:bg-red-700"
                    } text-white`}
                    onClick={toggleMute}
                    disabled={!isConnected}
                >
                    {isAudioEnabled ? <IoMic size={24} /> : <IoMicOff size={24} />}
                </button>
                <button
                    className={`rounded-full p-3 ${
                        isVideoEnabled ? "bg-gray-600 hover:bg-gray-700" : "bg-red-600 hover:bg-red-700"
                    } text-white`}
                    onClick={toggleVideo}
                    disabled={!isConnected}
                >
                    {isVideoEnabled ? <IoVideocam size={24} /> : <IoVideocamOff size={24} />}
                </button>
            </div>
        </div>
    )
}

export default VideoChatView



// 3nd Code:--




// import { useAppContext } from "@/context/AppContext"
// import { useSocket } from "@/context/SocketContext"
// import useResponsive from "@/hooks/useResponsive"
// import Display from "@/components/video/Display" // adjust import path if needed
// import { useEffect, useRef } from "react"

// const VideoChatView = () => {
//     const { viewHeight } = useResponsive()
//     const { peers, user } = useAppContext() // assuming `peers` is in AppContext
//     const { socket } = useSocket()
//     const localVideoRef = useRef<HTMLVideoElement>(null)

//     useEffect(() => {
//         // Attach local stream to local video element
//         if (localVideoRef.current && user?.stream) {
//             localVideoRef.current.srcObject = user.stream
//         }
//     }, [user?.stream])

//     return (
//         <div
//             className="flex max-h-full min-h-[400px] w-full flex-col gap-4 p-4"
//             style={{ height: viewHeight }}
//         >
//             <h1 className="view-title">Video Chat</h1>

//             {/* Conditionally render video feeds */}
//             <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//                 {user?.stream && (
//                     <Display
//                         displayName="You"
//                         videoRef={localVideoRef}
//                         style={{ border: "2px solid #00ffcc", borderRadius: "12px" }}
//                     />
//                 )}

//                 {peers &&
//                     peers.map((peer: any) => (
//                         <Display
//                             key={peer.id}
//                             displayName={peer.name}
//                             videoRef={peer.videoRef}
//                             style={{ border: "1px solid gray", borderRadius: "12px" }}
//                         />
//                     ))}
//             </div>

//             {/* Controls */}
//             <div className="flex justify-center gap-4">
//                 <button className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700">
//                     End Call
//                 </button>
//                 <button className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
//                     Mute
//                 </button>
//                 <button className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
//                     Toggle Video
//                 </button>
//             </div>
//         </div>
//     )
// }

// export default VideoChatView

