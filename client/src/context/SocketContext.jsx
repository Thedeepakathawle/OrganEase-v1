import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [notifications, setNotifications] = useState([]);

  // Synthesize Web Audio emergency siren tone
  const playEmergencySiren = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      // Siren warble frequency modulation
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.25);
      osc.frequency.linearRampToValueAtTime(800, now + 0.5);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.75);
      osc.frequency.linearRampToValueAtTime(800, now + 1.0);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  useEffect(() => {
    const s = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log('[Socket] Connected to OrganEase WebSocket Alert Service');
      setConnectionStatus('connected');
      if (user?.hospital?._id || user?.hospital) {
        s.emit('join_hospital', user.hospital._id || user.hospital);
      }
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnectionStatus('disconnected');
    });

    // Listen for high-priority emergency match alerts
    s.on('emergency_alert', (data) => {
      console.log('[Socket] Emergency Match Alert received:', data);
      setActiveAlert(data);
      playEmergencySiren();
      setNotifications(prev => [{
        id: Date.now(),
        type: 'EMERGENCY_MATCH',
        title: `🚨 HIGH PRIORITY MATCH: ${data.organType}`,
        message: `Match Score ${data.matchScore}% between ${data.donorHospitalName} and ${data.recipientHospitalName}`,
        timestamp: new Date().toLocaleTimeString(),
        data
      }, ...prev]);
    });

    s.on('global_emergency_alert', (data) => {
      if (!activeAlert) {
        setActiveAlert(data);
        playEmergencySiren();
      }
    });

    // Listen for real-time Green Corridor transit telemetry
    s.on('transit_telemetry', (data) => {
      setTelemetry(data);
    });

    s.on('global_transit_telemetry', (data) => {
      setTelemetry(data);
    });

    // Listen for delivery handshake verification
    s.on('delivery_verified', (data) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'DELIVERY_CONFIRMED',
        title: `✅ Organ Delivery Verified: ${data.organType}`,
        message: `Arrived at ${data.recipientHospitalName}. Archived into audit compliance ledger.`,
        timestamp: new Date().toLocaleTimeString(),
        data
      }, ...prev]);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  const dismissAlert = () => setActiveAlert(null);

  return (
    <SocketContext.Provider value={{
      socket,
      connectionStatus,
      activeAlert,
      telemetry,
      notifications,
      dismissAlert,
      soundEnabled,
      setSoundEnabled,
      playEmergencySiren
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
