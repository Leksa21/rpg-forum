import { useState, useEffect, useRef, useCallback } from 'react';
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

const CLEAR_ENCOUNTER = { active: false, opponent: null, waiting: false, result: null, battleId: null };

export function useMapSocket(token, mapX, mapY, travelInfo, myCharId) {
  const [otherPlayers, setOtherPlayers] = useState([]);
  const [encounter, setEncounter]       = useState(CLEAR_ENCOUNTER);

  const travelRef           = useRef(travelInfo);
  const posRef              = useRef({ mapX, mapY });
  const socketRef           = useRef(null);
  const encounterActiveRef  = useRef(false);
  const frozenOpponentIdRef = useRef(null);

  travelRef.current = travelInfo;
  posRef.current    = { mapX, mapY };

  const respondToEncounter = useCallback((action) => {
    if (!socketRef.current) return;
    socketRef.current.emit('map:encounter:respond', { action });
    if (action === 'flee') {
      encounterActiveRef.current  = false;
      frozenOpponentIdRef.current = null;
      setEncounter(CLEAR_ENCOUNTER);
    } else {
      setEncounter(prev => ({ ...prev, waiting: true }));
    }
  }, []);

  const clearEncounter = useCallback(() => {
    encounterActiveRef.current  = false;
    frozenOpponentIdRef.current = null;
    setEncounter(CLEAR_ENCOUNTER);
  }, []);

  useEffect(() => {
    if (!token || !myCharId) return;

    const socket = io('/map', { auth: { token } });
    socketRef.current = socket;

    const emitPosition = () => {
      // Freeze position broadcasts during an encounter
      if (encounterActiveRef.current) return;
      const [mx, my] = computeCurrentMapPos(
        posRef.current.mapX,
        posRef.current.mapY,
        travelRef.current
      );
      // atLocation: true when the player is stationary at a location (not mid-travel)
      const atLocation = !travelRef.current;
      socket.emit('map:position', { mapX: mx, mapY: my, atLocation });
    };

    socket.on('connect', emitPosition);

    socket.on('map:positions', (positions) => {
      setOtherPlayers(prev => {
        const frozenId = frozenOpponentIdRef.current;
        const next = Object.values(positions).filter(p => p.charId !== myCharId);
        if (!frozenId) return next;
        // Keep frozen opponent at their last known position
        return next.map(p => {
          if (p.charId === frozenId) {
            return prev.find(pp => pp.charId === frozenId) ?? p;
          }
          return p;
        });
      });
    });

    socket.on('map:encounter', ({ opponent }) => {
      encounterActiveRef.current  = true;
      frozenOpponentIdRef.current = opponent.charId;
      setEncounter({ active: true, opponent, waiting: false, result: null });
    });

    socket.on('map:encounter:result', ({ outcome, myAction, theirAction, battleId }) => {
      setEncounter(prev => ({ ...prev, waiting: false, result: { outcome, myAction, theirAction }, battleId: battleId || null }));
      if (!battleId) {
        setTimeout(() => {
          encounterActiveRef.current  = false;
          frozenOpponentIdRef.current = null;
          setEncounter(CLEAR_ENCOUNTER);
        }, 4000);
      }
    });

    const interval = setInterval(emitPosition, EMIT_INTERVAL);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, myCharId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { otherPlayers, encounter, respondToEncounter, clearEncounter };
}
