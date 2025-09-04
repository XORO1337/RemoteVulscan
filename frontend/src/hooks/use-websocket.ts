/**
 * React hook for WebSocket connections
 * Provides real-time updates for scan progress and results
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient, WebSocketClient } from '@/lib/api';

export interface ScanUpdate {
  scanId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  message?: string;
  vulnerabilities?: any[];
  results?: string;
}

export interface UseWebSocketProps {
  scanId?: string;
  autoConnect?: boolean;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  lastUpdate: ScanUpdate | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  joinScan: (id: string) => void;
  leaveScan: (id: string) => void;
  error: string | null;
}

export function useWebSocket({
  scanId,
  autoConnect = true
}: UseWebSocketProps = {}): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<ScanUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<WebSocketClient | null>(null);
  const currentScanIdRef = useRef<string | null>(null);

  const connect = useCallback(async () => {
    try {
      setError(null);
      
      if (!clientRef.current) {
        clientRef.current = new WebSocketClient();
      }

      await clientRef.current.connect();
      setIsConnected(true);

      // Set up message handler
      clientRef.current.onMessage((data) => {
        if (data.type === 'scan-update') {
          setLastUpdate(data);
        }
      });

      // If we have a scan ID, join it
      if (scanId) {
        joinScan(scanId);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to WebSocket';
      setError(errorMessage);
      setIsConnected(false);
    }
  }, [scanId]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      // Leave current scan if any
      if (currentScanIdRef.current) {
        clientRef.current.leaveScan(currentScanIdRef.current);
      }
      
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    setLastUpdate(null);
    currentScanIdRef.current = null;
  }, []);

  const joinScan = useCallback((id: string) => {
    if (clientRef.current && isConnected) {
      // Leave previous scan if any
      if (currentScanIdRef.current && currentScanIdRef.current !== id) {
        clientRef.current.leaveScan(currentScanIdRef.current);
      }
      
      clientRef.current.joinScan(id);
      currentScanIdRef.current = id;
    }
  }, [isConnected]);

  const leaveScan = useCallback((id: string) => {
    if (clientRef.current && isConnected) {
      clientRef.current.leaveScan(id);
      
      if (currentScanIdRef.current === id) {
        currentScanIdRef.current = null;
      }
    }
  }, [isConnected]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Handle scan ID changes
  useEffect(() => {
    if (isConnected && scanId && scanId !== currentScanIdRef.current) {
      joinScan(scanId);
    }
  }, [scanId, isConnected, joinScan]);

  return {
    isConnected,
    lastUpdate,
    connect,
    disconnect,
    joinScan,
    leaveScan,
    error
  };
}

// Hook for scan-specific WebSocket updates
export function useScanUpdates(scanId: string | undefined) {
  const [scanStatus, setScanStatus] = useState<string>('PENDING');
  const [progress, setProgress] = useState(0);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [message, setMessage] = useState<string>('');

  const { isConnected, lastUpdate, error } = useWebSocket({
    scanId,
    autoConnect: !!scanId
  });

  // Update scan data when we receive updates
  useEffect(() => {
    if (lastUpdate && lastUpdate.scanId === scanId) {
      setScanStatus(lastUpdate.status);
      
      if (lastUpdate.progress !== undefined) {
        setProgress(lastUpdate.progress);
      }
      
      if (lastUpdate.vulnerabilities) {
        setVulnerabilities(lastUpdate.vulnerabilities);
      }
      
      if (lastUpdate.message) {
        setMessage(lastUpdate.message);
      }
    }
  }, [lastUpdate, scanId]);

  return {
    isConnected,
    scanStatus,
    progress,
    vulnerabilities,
    message,
    error
  };
}

export default useWebSocket;
