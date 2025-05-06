import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import * as mediasoup from 'mediasoup';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

// Default configuration
const CONFIG = {
  server: {
    port: process.env.MEDIASOUP_PORT || 3032,
    ip: process.env.MEDIASOUP_IP || '127.0.0.1',
    listenIps: [
      {
        ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
      }
    ],
    protocol: 'udp',
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: 'debug',
    mediasoup: {
      numWorkers: Object.keys(os.cpus()).length,
      worker: {
        rtcMinPort: 40000,
        rtcMaxPort: 49999,
        logLevel: 'debug',
        logTags: [
          'info',
          'ice',
          'dtls',
          'rtp',
          'srtp',
          'rtcp',
          'rtx',
          'bwe',
          'score',
          'simulcast',
          'svc',
          'sctp'
        ],
      },
      router: {
        mediaCodecs: [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2
          },
          {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters: {
              'x-google-start-bitrate': 1000
            }
          },
          {
            kind: 'video',
            mimeType: 'video/VP9',
            clockRate: 90000,
            parameters: {
              'profile-id': 2,
              'x-google-start-bitrate': 1000
            }
          },
          {
            kind: 'video',
            mimeType: 'video/h264',
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '4d0032',
              'level-asymmetry-allowed': 1,
              'x-google-start-bitrate': 1000
            }
          },
          {
            kind: 'video',
            mimeType: 'video/h264',
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '42e01f',
              'level-asymmetry-allowed': 1,
              'x-google-start-bitrate': 1000
            }
          }
        ]
      },
      webRtcTransport: {
        listenIps: [
          {
            ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
            announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
          }
        ],
        initialAvailableOutgoingBitrate: 1000000,
        minimumAvailableOutgoingBitrate: 600000,
        maxSctpMessageSize: 262144,
        maxIncomingBitrate: 1500000
      }
    }
  }
};

// Room storage
const rooms = new Map();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Mediasoup workers
let workers: mediasoup.types.Worker[] = [];
let nextWorkerIndex = 0;

// Initialize mediasoup workers
async function initializeMediasoup() {
  const { numWorkers } = CONFIG.server.mediasoup;
  const promises = [];

  for (let i = 0; i < numWorkers; i++) {
    const promise = createWorker();
    promises.push(promise);
  }

  workers = await Promise.all(promises);
  console.log(`Created ${workers.length} mediasoup workers`);
}

// Create a mediasoup worker
async function createWorker() {
  const worker = await mediasoup.createWorker({
    logLevel: CONFIG.server.mediasoup.worker.logLevel as mediasoup.types.WorkerLogLevel,
    logTags: CONFIG.server.mediasoup.worker.logTags as mediasoup.types.WorkerLogTag[],
    rtcMinPort: CONFIG.server.mediasoup.worker.rtcMinPort,
    rtcMaxPort: CONFIG.server.mediasoup.worker.rtcMaxPort
  });

  worker.on('died', () => {
    console.error('mediasoup worker died, exiting...', worker.pid);
    setTimeout(() => process.exit(1), 2000);
  });

  return worker;
}

// Get next worker using round-robin
function getNextWorker() {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}

// Create a mediasoup router in a specific room
async function createRouter(roomId: string) {
  console.log(`Creating router for room ${roomId}`);
  const worker = getNextWorker();
  
  const router = await worker.createRouter({
    mediaCodecs: CONFIG.server.mediasoup.router.mediaCodecs as mediasoup.types.RtpCodecCapability[]
  });

  // Store the router in the room
  const room = rooms.get(roomId);
  if (room) {
    room.router = router;
  } else {
    rooms.set(roomId, { id: roomId, router, peers: new Map() });
  }

  return router;
}

// Get or create a router for a room
async function getOrCreateRouter(roomId: string) {
  let room = rooms.get(roomId);
  if (!room) {
    const router = await createRouter(roomId);
    room = rooms.get(roomId);
  }
  return room.router;
}

// API routes
app.post('/api/rooms', async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }

    await getOrCreateRouter(roomId);
    res.status(201).json({ roomId });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const exists = rooms.has(roomId);
  res.json({ exists });
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('New client connected:', socket.id);
  let currentRoomId: string | null = null;
  let currentPeer: any = null;

  // Custom request-response helper function (instead of adding to socket object)
  const makeSocketRequest = (event: string, data = {}) => {
    return new Promise((resolve) => {
      socket.emit(event, data, resolve);
    });
  };

  // Get router RTP capabilities
  socket.on('mediasoup:getRouterRtpCapabilities', async (data, callback) => {
    if (!data || !data.roomId) {
      return callback({ error: 'roomId is required' });
    }

    const router = await getOrCreateRouter(data.roomId);
    callback(router.rtpCapabilities);
  });

  // Join room
  socket.on('mediasoup:join', async (data) => {
    try {
      const { roomId } = data;
      console.log(`User ${socket.id} joining room ${roomId}`);
      
      // Store the room ID
      currentRoomId = roomId;
      
      // Join the socket.io room
      socket.join(roomId);

      // Create or get the router for this room
      await getOrCreateRouter(roomId);
    } catch (error) {
      console.error('Error on join:', error);
      socket.emit('mediasoup:error', { error: (error as Error).message });
    }
  });

  // Join room with full details
  socket.on('mediasoup:joinRoom', async (data) => {
    if (!currentRoomId) {
      return socket.emit('mediasoup:error', { error: 'No room joined yet' });
    }

    try {
      const { displayName, rtpCapabilities } = data;
      console.log(`User ${displayName} (${socket.id}) joining room ${currentRoomId} with capabilities`);

      const room = rooms.get(currentRoomId);
      if (!room) {
        throw new Error(`Room ${currentRoomId} not found`);
      }

      // Create a new peer
      const peer = {
        id: socket.id,
        displayName,
        rtpCapabilities,
        producers: new Map(),
        consumers: new Map(),
        transports: new Map()
      };

      // Store the peer in the room
      room.peers.set(socket.id, peer);
      currentPeer = peer;

      // Notify other peers in the room
      socket.to(currentRoomId).emit('mediasoup:peerJoined', {
        id: socket.id,
        displayName
      });

      // Send the list of other peers to the new peer
      const otherPeerDetails = [];
      for (const otherPeer of room.peers.values()) {
        if (otherPeer.id !== socket.id) {
          otherPeerDetails.push({
            id: otherPeer.id,
            displayName: otherPeer.displayName
          });
        }
      }

      socket.emit('mediasoup:availablePeers', { otherPeerDetails });
    } catch (error) {
      console.error('Error on joinRoom:', error);
      socket.emit('mediasoup:error', { error: (error as Error).message });
    }
  });

  // Create WebRTC transport
  socket.on('mediasoup:createProducerTransport', async (data, callback) => {
    try {
      if (!currentRoomId) {
        throw new Error('No room joined yet');
      }

      const room = rooms.get(currentRoomId);
      if (!room) {
        throw new Error(`Room ${currentRoomId} not found`);
      }

      const transport = await room.router.createWebRtcTransport({
        ...CONFIG.server.mediasoup.webRtcTransport,
        enableTcp: true,
        preferTcp: true,
        enableUdp: true,
        preferUdp: false
      });

      // Store the transport
      currentPeer.transports.set(transport.id, transport);

      // Handle transport events
      transport.on('dtlsstatechange', (dtlsState: string) => {
        if (dtlsState === 'closed') {
          transport.close();
        }
      });

      transport.on('close', () => {
        console.log('Transport closed', transport.id);
      });

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });
    } catch (error) {
      console.error('Error creating producer transport:', error);
      callback({ error: (error as Error).message });
    }
  });

  // Create WebRTC transport for consuming
  socket.on('mediasoup:createConsumerTransport', async (data, callback) => {
    try {
      if (!currentRoomId) {
        throw new Error('No room joined yet');
      }

      const room = rooms.get(currentRoomId);
      if (!room) {
        throw new Error(`Room ${currentRoomId} not found`);
      }

      const transport = await room.router.createWebRtcTransport({
        ...CONFIG.server.mediasoup.webRtcTransport,
        enableTcp: true,
        preferTcp: true,
        enableUdp: true,
        preferUdp: false
      });

      // Store the transport
      currentPeer.transports.set(transport.id, transport);

      // Handle transport events
      transport.on('dtlsstatechange', (dtlsState: string) => {
        if (dtlsState === 'closed') {
          transport.close();
        }
      });

      transport.on('close', () => {
        console.log('Transport closed', transport.id);
      });

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });
    } catch (error) {
      console.error('Error creating consumer transport:', error);
      callback({ error: (error as Error).message });
    }
  });

  // Connect WebRTC transport
  socket.on('mediasoup:connectProducerTransport', async (data, callback) => {
    try {
      const { dtlsParameters } = data;
      const transport = currentPeer.transports.get(data.transportId);
      
      if (!transport) {
        throw new Error(`Transport not found: ${data.transportId}`);
      }

      await transport.connect({ dtlsParameters });
      callback();
    } catch (error) {
      console.error('Error connecting producer transport:', error);
      callback({ error: (error as Error).message });
    }
  });

  // Connect WebRTC transport for consuming
  socket.on('mediasoup:connectConsumerTransport', async (data, callback) => {
    try {
      const { dtlsParameters } = data;
      const transport = currentPeer.transports.get(data.transportId);
      
      if (!transport) {
        throw new Error(`Transport not found: ${data.transportId}`);
      }

      await transport.connect({ dtlsParameters });
      callback();
    } catch (error) {
      console.error('Error connecting consumer transport:', error);
      callback({ error: (error as Error).message });
    }
  });

  // Create producer
  socket.on('mediasoup:produce', async (data, callback) => {
    try {
      const { transportId, kind, rtpParameters } = data;
      const transport = currentPeer.transports.get(transportId);
      
      if (!transport) {
        throw new Error(`Transport not found: ${transportId}`);
      }

      // Create producer
      const producer = await transport.produce({ kind, rtpParameters });
      
      // Store producer
      currentPeer.producers.set(producer.id, producer);

      // Inform other peers in the room
      for (const peer of rooms.get(currentRoomId).peers.values()) {
        if (peer.id !== socket.id && peer.rtpCapabilities) {
          socket.to(peer.id).emit('mediasoup:newProducer', {
            producerId: producer.id,
            producerPeerId: socket.id,
            kind
          });
        }
      }

      callback({ id: producer.id });
    } catch (error) {
      console.error('Error producing:', error);
      callback({ error: (error as Error).message });
    }
  });

  // Consume stream
  socket.on('mediasoup:consume', async (data, callback) => {
    try {
      const { peerId, rtpCapabilities } = data;
      const room = rooms.get(currentRoomId);
      
      if (!room) {
        throw new Error(`Room ${currentRoomId} not found`);
      }

      const peer = room.peers.get(peerId);
      if (!peer) {
        throw new Error(`Peer ${peerId} not found`);
      }

      // Get transport
      const consumerTransport = Array.from(currentPeer.transports.values()).find(
        (transport: any) => transport.appData && transport.appData.consuming
      ) as mediasoup.types.WebRtcTransport;

      if (!consumerTransport) {
        throw new Error('No consumer transport found');
      }

      // For each producer of the selected peer
      for (const [producerId, producer] of peer.producers.entries()) {
        // Check if we can consume it
        if (!room.router.canConsume({
          producerId,
          rtpCapabilities
        })) {
          console.warn(`Cannot consume producer ${producerId}`);
          continue;
        }

        // Create consumer
        const consumer = await consumerTransport.consume({
          producerId,
          rtpCapabilities,
          paused: true
        });

        // Store consumer
        currentPeer.consumers.set(consumer.id, consumer);

        // Send consumer info to client
        socket.emit('mediasoup:newConsumer', {
          peerId,
          producerId,
          id: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          type: consumer.type,
          appData: consumer.appData,
          producerPaused: consumer.producerPaused
        });
      }
    } catch (error) {
      console.error('Error consuming:', error);
      if (callback) callback({ error: (error as Error).message });
    }
  });

  // Resume consumer
  socket.on('mediasoup:resumeConsumer', async (data) => {
    try {
      const { consumerId } = data;
      const consumer = currentPeer.consumers.get(consumerId);
      
      if (!consumer) {
        throw new Error(`Consumer ${consumerId} not found`);
      }

      await consumer.resume();
    } catch (error) {
      console.error('Error resuming consumer:', error);
      socket.emit('mediasoup:error', { error: (error as Error).message });
    }
  });

  // Leave room
  socket.on('mediasoup:leaveRoom', () => {
    try {
      if (!currentRoomId) return;

      const room = rooms.get(currentRoomId);
      if (!room) return;

      // Close all transports
      if (currentPeer) {
        for (const transport of currentPeer.transports.values()) {
          transport.close();
        }

        // Remove peer from room
        room.peers.delete(socket.id);

        // Notify other peers
        socket.to(currentRoomId).emit('mediasoup:peerLeft', { id: socket.id });
      }

      // Leave the Socket.IO room
      socket.leave(currentRoomId);
      
      // Clean up
      currentRoomId = null;
      currentPeer = null;
      
      console.log(`User ${socket.id} left room`);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up on disconnect, same as leaveRoom
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        // Close all transports
        if (currentPeer) {
          for (const transport of currentPeer.transports.values()) {
            transport.close();
          }

          // Remove peer from room
          room.peers.delete(socket.id);

          // Notify other peers
          socket.to(currentRoomId).emit('mediasoup:peerLeft', { id: socket.id });
        }
      }
    }
  });
});

// Start the server
async function run() {
  try {
    // Initialize mediasoup
    await initializeMediasoup();

    // Start Express server
    const PORT = CONFIG.server.port;
    server.listen(PORT, () => {
      console.log(`Mediasoup server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start mediasoup server:', error);
    process.exit(1);
  }
}

run(); 