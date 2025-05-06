import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAppContext } from './AppContext';
import MediasoupServerAPI from '@/utils/mediasoup-adapter';
import { Socket } from 'socket.io-client';

// Dynamic import for mediasoup-client to avoid SSR issues
let mediasoupClient: any = null;

interface MediasoupPeer {
  id: string;
  displayName: string;
  videoRef: React.RefObject<HTMLVideoElement>;
}

interface MediasoupContextType {
  isConnected: boolean;
  peers: MediasoupPeer[];
  localVideoRef: React.RefObject<HTMLVideoElement>;
  startVideoChat: () => Promise<void>;
  stopVideoChat: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

const MediasoupContext = createContext<MediasoupContextType | null>(null);

const MEDIASOUP_SOCKET_EVENTS = {
  ROOM_CREATED: 'mediasoup:room-created',
  ROOM_JOINED: 'mediasoup:room-joined',
};

// Interfaces for mediasoup transport events
interface ConnectTransportParams {
  dtlsParameters: any;
}

interface ProduceParams {
  kind: string;
  rtpParameters: any;
}

export const MediasoupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { currentUser } = useAppContext();
  const [peers, setPeers] = useState<MediasoupPeer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [mediasoupSocket, setMediasoupSocket] = useState<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  const [device, setDevice] = useState<any>(null);
  const [producerTransport, setProducerTransport] = useState<any>(null);
  const [consumerTransport, setConsumerTransport] = useState<any>(null);
  const [videoProducer, setVideoProducer] = useState<any>(null);
  const [audioProducer, setAudioProducer] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Load mediasoup client dynamically
  useEffect(() => {
    const loadMediasoup = async () => {
      try {
        mediasoupClient = await import('mediasoup-client');
      } catch (error) {
        console.error('Failed to load mediasoup-client:', error);
      }
    };
    
    loadMediasoup();
  }, []);

  // Initialize room when joining a CodeFusionX room
  useEffect(() => {
    if (!socket || !currentUser.roomId) return;

    // When a user joins a CodeFusionX room, initialize the corresponding Mediasoup room
    const initializeMediasoupRoom = async () => {
      try {
        // Check if room already exists on the Mediasoup server
        const exists = await MediasoupServerAPI.roomExists(currentUser.roomId);
        
        if (!exists) {
          // Create the room on the Mediasoup server
          await MediasoupServerAPI.initializeRoom(currentUser.roomId);
          
          // Notify other users in the same room about the creation of the Mediasoup room
          socket.emit(MEDIASOUP_SOCKET_EVENTS.ROOM_CREATED, { roomId: currentUser.roomId });
        }
      } catch (error) {
        console.error('Failed to initialize Mediasoup room:', error);
      }
    };

    initializeMediasoupRoom();
  }, [socket, currentUser.roomId]);

  // Track peers joining and leaving
  useEffect(() => {
    if (!mediasoupSocket || !isConnected) return;

    const onlinePeers = new Map<string, MediasoupPeer>();

    const updatePeersState = () => {
      setPeers([...onlinePeers.values()]);
    };

    // Setup mediasoup peer notifications
    mediasoupSocket.on('mediasoup:peerJoined', (data: { id: string; displayName: string }) => {
      const newPeer: MediasoupPeer = {
        ...data,
        videoRef: React.createRef<HTMLVideoElement>()
      };
      onlinePeers.set(data.id, newPeer);
      updatePeersState();

      // Request to consume this peer's streams
      if (consumerTransport) {
        consumePeer(data.id);
      }
    });

    mediasoupSocket.on('mediasoup:peerLeft', (data: { id: string }) => {
      onlinePeers.delete(data.id);
      updatePeersState();
    });

    mediasoupSocket.on('mediasoup:availablePeers', (data: { otherPeerDetails: Array<{ id: string; displayName: string }> }) => {
      onlinePeers.clear();

      for (const otherPeer of data.otherPeerDetails) {
        onlinePeers.set(otherPeer.id, {
          ...otherPeer,
          videoRef: React.createRef<HTMLVideoElement>()
        });
      }

      updatePeersState();

      // Request to consume all available peers
      if (consumerTransport) {
        for (const peer of onlinePeers.values()) {
          consumePeer(peer.id);
        }
      }
    });

    mediasoupSocket.on('mediasoup:newConsumer', async (data: any) => {
      const {
        peerId,
        producerId,
        id,
        kind,
        rtpParameters,
      } = data;

      const consumer = await consumerTransport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
      });

      // Store consumer
      const peer = onlinePeers.get(peerId);
      if (peer && peer.videoRef.current && kind === 'video') {
        const stream = new MediaStream([consumer.track]);
        peer.videoRef.current.srcObject = stream;
      }

      // Tell the server we're ready to consume
      mediasoupSocket.emit('mediasoup:resumeConsumer', { consumerId: id });
    });

    return () => {
      mediasoupSocket.off('mediasoup:peerJoined');
      mediasoupSocket.off('mediasoup:peerLeft');
      mediasoupSocket.off('mediasoup:availablePeers');
      mediasoupSocket.off('mediasoup:newConsumer');
    };
  }, [mediasoupSocket, isConnected, consumerTransport]);

  const connectToMediasoupServer = (): Promise<Socket | null> => {
    return new Promise((resolve) => {
      try {
        const wsUrl = MediasoupServerAPI.getWebSocketUrl();
        console.log('Connecting to mediasoup server at:', wsUrl);
        
        // Create a new connection to the Mediasoup server using Socket.IO
        import('socket.io-client')
          .then(({ io }) => {
            const newSocket: Socket = io(wsUrl, {
              transports: ['websocket'],
              path: '/mediasoup',
              reconnection: true,
              reconnectionAttempts: 5,
              reconnectionDelay: 1000,
              reconnectionDelayMax: 5000,
              timeout: 10000
            });

            newSocket.on('connect', () => {
              console.log('Connected to Mediasoup server successfully');
              setIsConnected(true);
            });

            newSocket.on('disconnect', () => {
              console.log('Disconnected from Mediasoup server');
              setIsConnected(false);
            });

            newSocket.on('connect_error', (error) => {
              console.error('Mediasoup server connection error:', error);
              setIsConnected(false);
            });

            // Add connection timeout handling
            setTimeout(() => {
              if (!newSocket.connected) {
                console.error('Connection to Mediasoup server timed out');
                setIsConnected(false);
                resolve(null);
              }
            }, 10000);

            setMediasoupSocket(newSocket);
            resolve(newSocket);
          })
          .catch(error => {
            console.error('Failed to load socket.io-client:', error);
            resolve(null);
          });
      } catch (error) {
        console.error('Failed to connect to Mediasoup server:', error);
        resolve(null);
      }
    });
  };

  const consumePeer = async (peerId: string) => {
    if (!mediasoupSocket || !consumerTransport) return;
    
    mediasoupSocket.emit('mediasoup:consume', {
      peerId,
      rtpCapabilities: device.rtpCapabilities
    });
  };

  const startVideoChat = async () => {
    if (!socket || !mediasoupClient || isConnected) return;

    try {
      // Connect to mediasoup server
      const msSocket = await connectToMediasoupServer();
      if (!msSocket) {
        throw new Error('Failed to connect to Mediasoup server');
      }
      
      // Join the mediasoup room
      msSocket.emit('mediasoup:join', { roomId: currentUser.roomId });
      
      // Get router RTP capabilities
      const rtpCapabilities = await new Promise((resolve) => {
        msSocket.emit('mediasoup:getRouterRtpCapabilities', {}, resolve);
      });

      // Load device
      const mediasoupDevice = new mediasoupClient.Device();
      await mediasoupDevice.load({ routerRtpCapabilities: rtpCapabilities });
      setDevice(mediasoupDevice);

      // Create producer transport
      const producerTransportParams = await new Promise((resolve) => {
        msSocket.emit('mediasoup:createProducerTransport', {}, resolve);
      });

      const newProducerTransport = mediasoupDevice.createSendTransport(producerTransportParams);
      setProducerTransport(newProducerTransport);

      // Handle producer transport events
      newProducerTransport.on('connect', async (params: ConnectTransportParams, callback: () => void, errback: (error: Error) => void) => {
        msSocket.emit('mediasoup:connectProducerTransport', { dtlsParameters: params.dtlsParameters }, 
          callback,
          (error: any) => errback(error));
      });

      newProducerTransport.on('produce', async (params: ProduceParams, callback: (arg: { id: string }) => void, errback: (error: Error) => void) => {
        try {
          msSocket.emit('mediasoup:produce', {
            transportId: newProducerTransport.id,
            kind: params.kind,
            rtpParameters: params.rtpParameters
          }, (response: { id: string }) => {
            callback({ id: response.id });
          });
        } catch (error) {
          errback(error as Error);
        }
      });

      // Create consumer transport
      const consumerTransportParams = await new Promise((resolve) => {
        msSocket.emit('mediasoup:createConsumerTransport', {}, resolve);
      });

      const newConsumerTransport = mediasoupDevice.createRecvTransport(consumerTransportParams);
      setConsumerTransport(newConsumerTransport);

      // Handle consumer transport events
      newConsumerTransport.on('connect', (params: ConnectTransportParams, callback: () => void, errback: (error: Error) => void) => {
        msSocket.emit('mediasoup:connectConsumerTransport', 
          { dtlsParameters: params.dtlsParameters },
          callback,
          (error: any) => errback(error));
      });

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Produce video
      if (mediasoupDevice.canProduce('video')) {
        const videoTrack = stream.getVideoTracks()[0];
        const videoProducer = await newProducerTransport.produce({ track: videoTrack });
        setVideoProducer(videoProducer);
      }

      // Produce audio
      if (mediasoupDevice.canProduce('audio')) {
        const audioTrack = stream.getAudioTracks()[0];
        const audioProducer = await newProducerTransport.produce({ track: audioTrack });
        setAudioProducer(audioProducer);
      }

      // Join the room with our capabilities
      msSocket.emit('mediasoup:joinRoom', {
        displayName: currentUser.username,
        rtpCapabilities: mediasoupDevice.rtpCapabilities
      });

      // Notify other users in CodeFusionX about joining the video chat
      socket.emit(MEDIASOUP_SOCKET_EVENTS.ROOM_JOINED, { username: currentUser.username });

      setIsConnected(true);
    } catch (error) {
      console.error('Failed to start video chat:', error);
      stopVideoChat();
    }
  };

  const stopVideoChat = () => {
    if (!isConnected) return;

    // Close all producers
    if (videoProducer) {
      videoProducer.close();
      setVideoProducer(null);
    }

    if (audioProducer) {
      audioProducer.close();
      setAudioProducer(null);
    }

    // Close transports
    if (producerTransport) {
      producerTransport.close();
      setProducerTransport(null);
    }

    if (consumerTransport) {
      consumerTransport.close();
      setConsumerTransport(null);
    }

    // Stop local media
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Clear local video
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // Leave the room
    if (mediasoupSocket) {
      mediasoupSocket.emit('mediasoup:leaveRoom');
      mediasoupSocket.close();
      setMediasoupSocket(null);
    }

    setIsConnected(false);
    setPeers([]);
  };

  const toggleMute = () => {
    if (!localStream || !audioProducer) return;

    if (isAudioEnabled) {
      audioProducer.pause();
    } else {
      audioProducer.resume();
    }

    localStream.getAudioTracks().forEach(track => {
      track.enabled = !isAudioEnabled;
    });

    setIsAudioEnabled(!isAudioEnabled);
  };

  const toggleVideo = () => {
    if (!localStream || !videoProducer) return;

    if (isVideoEnabled) {
      videoProducer.pause();
    } else {
      videoProducer.resume();
    }

    localStream.getVideoTracks().forEach(track => {
      track.enabled = !isVideoEnabled;
    });

    setIsVideoEnabled(!isVideoEnabled);
  };

  return (
    <MediasoupContext.Provider value={{
      isConnected,
      peers,
      localVideoRef,
      startVideoChat,
      stopVideoChat,
      toggleMute,
      toggleVideo,
      isAudioEnabled,
      isVideoEnabled
    }}>
      {children}
    </MediasoupContext.Provider>
  );
};

export const useMediasoup = () => {
  const context = useContext(MediasoupContext);
  if (!context) {
    throw new Error('useMediasoup must be used within a MediasoupProvider');
  }
  return context;
}; 