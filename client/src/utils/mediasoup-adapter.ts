import axios from 'axios';

// Define the window ENV type
declare global {
  interface Window {
    ENV?: {
      VITE_MEDIASOUP_SERVER_URL?: string;
      VITE_IDE_SERVER_URL?: string;
    };
  }
}

// Define a more reliable way to get the mediasoup server URL
const getMediasoupServerUrl = (): string => {
  // Try to get the URL from environment variables or window.ENV
  const serverUrl = 
    import.meta.env.VITE_MEDIASOUP_SERVER_URL || 
    (window.ENV && window.ENV.VITE_MEDIASOUP_SERVER_URL) || 
    'http://localhost:3031';
  
  console.log('Using Mediasoup server URL:', serverUrl);
  return serverUrl;
};

const MEDIASOUP_SERVER_URL = getMediasoupServerUrl();

/**
 * Adapter to communicate with the Mediasoup server
 */
export const MediasoupServerAPI = {
  /**
   * Initialize a new room with the given ID on the mediasoup server
   * @param roomId The room ID to create
   */
  initializeRoom: async (roomId: string): Promise<void> => {
    try {
      await axios.post(`${MEDIASOUP_SERVER_URL}/api/rooms`, { roomId });
    } catch (error) {
      console.error('Failed to initialize mediasoup room:', error);
      throw error;
    }
  },

  /**
   * Check if a room exists on the mediasoup server
   * @param roomId The room ID to check
   */
  roomExists: async (roomId: string): Promise<boolean> => {
    try {
      const response = await axios.get(`${MEDIASOUP_SERVER_URL}/api/rooms/${roomId}`);
      return response.data.exists;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get mediasoup WebSocket URL
   * This utility function generates the appropriate WebSocket URL based on the window location
   * or the configured server URL.
   */
  getWebSocketUrl: (): string => {
    try {
      // If running in browser, derive from window.location
      if (typeof window !== 'undefined') {
        const isSecure = window.location.protocol === 'https:';
        const hostname = window.location.hostname;
        const wsProtocol = isSecure ? 'wss' : 'ws';
        
        // Use the mediasoup server port from the environment variable or default
        const serverUrl = new URL(MEDIASOUP_SERVER_URL);
        const port = serverUrl.port || '3031';
        
        return `${wsProtocol}://${hostname}:${port}`;
      }
      
      // Fallback to the environment variable
      const serverUrl = new URL(MEDIASOUP_SERVER_URL);
      const wsProtocol = serverUrl.protocol === 'https:' ? 'wss' : 'ws';
      return `${wsProtocol}://${serverUrl.hostname}:${serverUrl.port || '3031'}`;
    } catch (error) {
      console.error('Error generating WebSocket URL:', error);
      // Provide a safe fallback
      return 'ws://localhost:3031';
    }
  }
};

export default MediasoupServerAPI; 