// import useResponsive from "@/hooks/useResponsive"

// const VideoChatView = () => {
//     const { viewHeight } = useResponsive()

//     return (
//         <div
//             className="flex max-h-full min-h-[400px] w-full flex-col gap-4 p-4"
//             style={{ height: viewHeight }}
//         >
//             <h1 className="view-title">Video Chat</h1>

//             {/* Video stream area */}
//             <div className="flex-1 rounded-lg bg-darkHover p-4 text-white flex items-center justify-center">
//                 <p>Video stream will appear here</p>
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



// 2nd Code:--



import useResponsive from "@/hooks/useResponsive"
import React, { useRef } from "react"
import Display from "@/components/video/Display" // Adjust path as needed

const dummyUsers = [
    { id: "1", name: "You" },
    { id: "2", name: "Alice" },
    { id: "3", name: "Bob" }
]

const VideoChatView = () => {
    const { viewHeight } = useResponsive()

    // Use refs for each video feed
    const videoRefs = dummyUsers.reduce((acc, user) => {
        acc[user.id] = useRef<HTMLVideoElement>(null)
        return acc
    }, {} as Record<string, React.RefObject<HTMLVideoElement>>)

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-4 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Video Chat</h1>

            {/* Dynamic video feed area */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dummyUsers.map((user) => (
                    <Display
                        key={user.id}
                        displayName={user.name}
                        videoRef={videoRefs[user.id]}
                        style={{
                            border: "1px solid #444",
                            borderRadius: "10px",
                            padding: "8px",
                            background: "#2f2f2f",
                            color: "white"
                        }}
                    />
                ))}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4 pt-2">
                <button className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700">
                    End Call
                </button>
                <button className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
                    Mute
                </button>
                <button className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
                    Toggle Video
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

