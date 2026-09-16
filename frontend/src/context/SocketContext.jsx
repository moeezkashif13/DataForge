import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { selectOrganizationId } from '../store/slices/authSlice';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [lastCommand, setLastCommand] = useState(null);
  const socketRef = useRef(null);
  const commandListenersRef = useRef(new Map());

  // Current active organization ID from Redux store or localStorage
  const reduxOrgId = useSelector(selectOrganizationId);
  const activeOrgId =
    reduxOrgId ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('dataforge_org_id')
      : null);

  useEffect(() => {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const token = localStorage.getItem('dataforge_token') || '';

    const socket = io(backendUrl, {
      auth: {
        clientType: 'frontend',
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[Socket.IO] Connected to backend! Socket ID: ${socket.id}`);
      setIsConnected(true);
      setSocketId(socket.id);
    });

    socket.on('frontend:connected', (data) => {
      console.log('[Socket.IO] Frontend session confirmed by backend:', data);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`[Socket.IO] Disconnected from backend: ${reason}`);
      setIsConnected(false);
      setSocketId(null);
    });

    socket.on('connect_error', (err) => {
      console.error(`[Socket.IO] Connection error:`, err.message);
    });

    // Listen for incoming commands from backend
    socket.on('backend:command', (envelope) => {
      console.log(`[Socket.IO] Received backend:command:`, envelope);
      setLastCommand(envelope);

      const commandType = envelope?.type;
      if (commandType && commandListenersRef.current.has(commandType)) {
        const listeners = commandListenersRef.current.get(commandType);
        listeners.forEach((handler) => {
          try {
            handler(envelope.payload, envelope.meta);
          } catch (handlerErr) {
            console.error(
              `[Socket.IO] Error in handler for command "${commandType}":`,
              handlerErr,
            );
          }
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Automatically join and leave org:{organizationId} room when user is logged in
  useEffect(() => {
    if (!socketRef.current || !isConnected || !activeOrgId) return;

    const orgRoom = `org:${activeOrgId}`;
    console.log(`[Socket.IO] Joining organization room: "${orgRoom}"`);
    socketRef.current.emit('join', { room: orgRoom });

    return () => {
      if (socketRef.current && socketRef.current.connected) {
        console.log(`[Socket.IO] Leaving organization room: "${orgRoom}"`);
        socketRef.current.emit('leave', { room: orgRoom });
      }
    };
  }, [isConnected, activeOrgId]);

  /**
   * Send a command from Frontend to Backend
   * @param {string} type - Command name, e.g. 'START_MIGRATION', 'CANCEL_MIGRATION'
   * @param {any} payload - Command parameters/data
   * @param {object} meta - Optional metadata (projectId, orgId, correlationId)
   */
  const sendCommand = useCallback(
    (type, payload = {}, meta = {}) => {
      if (!socketRef.current || !socketRef.current.connected) {
        console.warn(
          `[Socket.IO] Cannot send command "${type}": socket is not connected to backend`,
        );
        return false;
      }

      const envelope = {
        type,
        payload,
        meta: {
          timestamp: new Date().toISOString(),
          organizationId: activeOrgId,
          ...meta,
        },
      };

      socketRef.current.emit('frontend:command', envelope);
      console.log(`[Socket.IO] Sent frontend:command [${type}]:`, envelope);
      return true;
    },
    [activeOrgId],
  );

  /**
   * Subscribe to a specific command type sent from backend
   * @param {string} type - Command type string
   * @param {Function} handler - Callback receiving (payload, meta)
   * @returns {Function} unsubscribe function
   */
  const onCommand = useCallback((type, handler) => {
    if (!type || typeof handler !== 'function') return () => {};

    if (!commandListenersRef.current.has(type)) {
      commandListenersRef.current.set(type, new Set());
    }
    commandListenersRef.current.get(type).add(handler);

    // Return cleanup function
    return () => {
      const listeners = commandListenersRef.current.get(type);
      if (listeners) {
        listeners.delete(handler);
        if (listeners.size === 0) {
          commandListenersRef.current.delete(type);
        }
      }
    };
  }, []);

  /**
   * Join a room manually (e.g. for custom rooms)
   */
  const joinRoom = useCallback((room) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join', { room });
      console.log(`[Socket.IO] Sent join request for room: "${room}"`);
    }
  }, []);

  /**
   * Leave a room manually
   */
  const leaveRoom = useCallback((room) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave', { room });
      console.log(`[Socket.IO] Sent leave request for room: "${room}"`);
    }
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    socketId,
    lastCommand,
    activeOrgId,
    sendCommand,
    onCommand,
    joinRoom,
    leaveRoom,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
