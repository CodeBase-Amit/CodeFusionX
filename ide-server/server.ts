import express, { Response, Request } from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import path from "path";

// Define socket events
enum SocketEvent {
    JOIN_REQUEST = "join-request",
    JOIN_ACCEPTED = "join-accepted",
    USER_JOINED = "user-joined",
    USER_DISCONNECTED = "user-disconnected",
    SYNC_FILE_STRUCTURE = "sync-file-structure",
    DIRECTORY_CREATED = "directory-created",
    DIRECTORY_UPDATED = "directory-updated",
    DIRECTORY_RENAMED = "directory-renamed",
    DIRECTORY_DELETED = "directory-deleted",
    FILE_CREATED = "file-created",
    FILE_UPDATED = "file-updated",
    FILE_RENAMED = "file-renamed",
    FILE_DELETED = "file-deleted",
    USER_OFFLINE = "offline",
    USER_ONLINE = "online",
    SEND_MESSAGE = "send-message",
    RECEIVE_MESSAGE = "receive-message",
    TYPING_START = "typing-start",
    TYPING_PAUSE = "typing-pause",
    USERNAME_EXISTS = "username-exists",
    REQUEST_DRAWING = "request-drawing",
    SYNC_DRAWING = "sync-drawing",
    DRAWING_UPDATE = "drawing-update",
    // Mediasoup events
    MEDIASOUP_ROOM_CREATED = "mediasoup:room-created",
    MEDIASOUP_ROOM_JOINED = "mediasoup:room-joined",
    MEDIASOUP_USER_JOINED = "mediasoup:user-joined",
    MEDIASOUP_USER_LEFT = "mediasoup:user-left",
}

// User connection status
enum USER_CONNECTION_STATUS {
    ONLINE = "online",
    OFFLINE = "offline",
}

// User interface
interface User {
    username: string;
    roomId: string;
    status: USER_CONNECTION_STATUS;
    cursorPosition: number;
    typing: boolean;
    socketId: string;
    currentFile: string | null;
}

type SocketId = string;

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
    maxHttpBufferSize: 1e8,
    pingTimeout: 60000,
});

let userSocketMap: User[] = [];

// Function to get all users in a room
function getUsersInRoom(roomId: string): User[] {
    return userSocketMap.filter((user) => user.roomId == roomId);
}

// Function to get room id by socket id
function getRoomId(socketId: SocketId): string | null {
    const roomId = userSocketMap.find(
        (user) => user.socketId === socketId
    )?.roomId;

    if (!roomId) {
        console.error("Room ID is undefined for socket ID:", socketId);
        return null;
    }
    return roomId;
}

function getUserBySocketId(socketId: SocketId): User | null {
    const user = userSocketMap.find((user) => user.socketId === socketId);
    if (!user) {
        console.error("User not found for socket ID:", socketId);
        return null;
    }
    return user;
}

io.on("connection", (socket) => {
    // Handle user actions
    socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
        // Check is username exist in the room
        const isUsernameExist = getUsersInRoom(roomId).filter(
            (u) => u.username === username
        );
        if (isUsernameExist.length > 0) {
            io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS);
            return;
        }

        const user = {
            username,
            roomId,
            status: USER_CONNECTION_STATUS.ONLINE,
            cursorPosition: 0,
            typing: false,
            socketId: socket.id,
            currentFile: null,
        };
        userSocketMap.push(user);
        socket.join(roomId);
        socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user });
        const users = getUsersInRoom(roomId);
        io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users });
    });

    socket.on("disconnecting", () => {
        const user = getUserBySocketId(socket.id);
        if (!user) return;
        const roomId = user.roomId;
        socket.broadcast
            .to(roomId)
            .emit(SocketEvent.USER_DISCONNECTED, { user });
        userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id);
        socket.leave(roomId);
    });

    // Handle file actions
    socket.on(
        SocketEvent.SYNC_FILE_STRUCTURE,
        ({ fileStructure, openFiles, activeFile, socketId }) => {
            io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
                fileStructure,
                openFiles,
                activeFile,
            });
        }
    );

    socket.on(
        SocketEvent.DIRECTORY_CREATED,
        ({ parentDirId, newDirectory }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId) return;
            socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, {
                parentDirId,
                newDirectory,
            });
        }
    );

    socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, {
            dirId,
            children,
        });
    });

    socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_RENAMED, {
            dirId,
            newName,
        });
    });

    socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast
            .to(roomId)
            .emit(SocketEvent.DIRECTORY_DELETED, { dirId });
    });

    socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast
            .to(roomId)
            .emit(SocketEvent.FILE_CREATED, { parentDirId, newFile });
    });

    socket.on(SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast.to(roomId).emit(SocketEvent.FILE_UPDATED, {
            fileId,
            newContent,
        });
    });

    socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast.to(roomId).emit(SocketEvent.FILE_RENAMED, {
            fileId,
            newName,
        });
    });

    socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId });
    });

    // Handle user status
    socket.on(SocketEvent.USER_OFFLINE, ({ socketId }) => {
        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socketId) {
                return { ...user, status: USER_CONNECTION_STATUS.OFFLINE };
            }
            return user;
        });
        const roomId = getRoomId(socketId);
        if (!roomId) return;
        socket.broadcast.to(roomId).emit(SocketEvent.USER_OFFLINE, { socketId });
    });

    socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socketId) {
                return { ...user, status: USER_CONNECTION_STATUS.ONLINE };
            }
            return user;
        });
        const roomId = getRoomId(socketId);
        if (!roomId) return;
        socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId });
    });

    // Handle chat actions
    socket.on(SocketEvent.SEND_MESSAGE, ({ message }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast
            .to(roomId)
            .emit(SocketEvent.RECEIVE_MESSAGE, { message });
    });

    // Handle cursor position
    socket.on(SocketEvent.TYPING_START, ({ cursorPosition }) => {
        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socket.id) {
                return { ...user, typing: true, cursorPosition };
            }
            return user;
        });
        const user = getUserBySocketId(socket.id);
        if (!user) return;
        const roomId = user.roomId;
        socket.broadcast.to(roomId).emit(SocketEvent.TYPING_START, { user });
    });

    socket.on(SocketEvent.TYPING_PAUSE, () => {
        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socket.id) {
                return { ...user, typing: false };
            }
            return user;
        });
        const user = getUserBySocketId(socket.id);
        if (!user) return;
        const roomId = user.roomId;
        socket.broadcast.to(roomId).emit(SocketEvent.TYPING_PAUSE, { user });
    });

    socket.on(SocketEvent.REQUEST_DRAWING, () => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast
            .to(roomId)
            .emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id });
    });

    socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
        socket.broadcast
            .to(socketId)
            .emit(SocketEvent.SYNC_DRAWING, { drawingData });
    });

    socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, {
            snapshot,
        });
    });

    // Handle mediasoup related events
    socket.on(SocketEvent.MEDIASOUP_ROOM_CREATED, ({ roomId }) => {
        console.log(`Mediasoup room created for room ${roomId}`);
        // Notify other users in the room about the mediasoup room creation
        socket.broadcast.to(roomId).emit(SocketEvent.MEDIASOUP_ROOM_CREATED, { roomId });
    });

    socket.on(SocketEvent.MEDIASOUP_ROOM_JOINED, ({ username }) => {
        console.log(`User ${username} joined mediasoup room`);
        const roomId = getRoomId(socket.id);
        if (!roomId) return;
        
        // Notify other users in the room about the user joining mediasoup
        socket.broadcast.to(roomId).emit(SocketEvent.MEDIASOUP_USER_JOINED, { 
            username,
            socketId: socket.id 
        });
    });
});

const PORT = process.env.PORT || 3022;

app.get("/", (req: Request, res: Response) => {
    // Send the index.html file
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

server.listen(PORT, () => {
    console.log(`IDE Server listening on port ${PORT}`);
}); 