import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const EMIT_INTERVAL = 3000;

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

function computeCurrentMapPos(mapX, mapY, travelInfo) {
  if (!travelInfo) return [mapX, mapY];
  const total   = new Date(travelInfo.arrivalTime) - new Date(travelInfo.departureTime);
  const elapsed = Date.now() - new Date(travelInfo.departureTime);
  const raw     = Math.min(1, Math.max(0, elapsed / total));
  const p       = smoothStep(raw);
  return [
    travelInfo.fromMapX + (travelInfo.toMapX - travelInfo.fromMapX) * p,
    travelInfo.fromMapY + (travelInfo.toMapY - travelInfo.fromMapY) * p,
  ];
}

export function useMapSocket(token, mapX, mapY, travelInfo, myCharId) {
  const [otherPlayers, setOtherPlayers] = useState([]);

  // Keep mutable refs so interval callback always has fresh values
  const travelRef = useRef(travelInfo);
  const posRef    = useRef({ mapX, mapY });
  travelRef.current = travelInfo;
  posRef.current    = { mapX, mapY };

  useEffect(() => {
    if (!token || !myCharId) return;

    const socket = io('/map', { auth: { token } });

    const emitPosition = () => {
      const [mx, my] = computeCurrentMapPos(
        posRef.current.mapX,
        posRef.current.mapY,
        travelRef.current
      );
      socket.emit('map:position', { mapX: mx, mapY: my });
    };

    socket.on('connect', emitPosition);

    socket.on('map:positions', (positions) => {
      const others = Object.values(positions).filter(p => p.charId !== myCharId);
      setOtherPlayers(others);
    });

    const interval = setInterval(emitPosition, EMIT_INTERVAL);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [token, myCharId]); // eslint-disable-line react-hooks/exhaustive-deps

  return otherPlayers;
}
