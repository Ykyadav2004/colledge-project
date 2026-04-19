import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentLocation, watchLocation, clearWatch } from '../utils/geolocation';

export const useGeolocation = (options = {}) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef(null);

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getCurrentLocation();
      setLocation(coords);
      return coords;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const startWatching = useCallback((onLocationUpdate, onError) => {
    if (watchIdRef.current) {
      clearWatch(watchIdRef.current);
    }

    watchIdRef.current = watchLocation(
      (coords) => {
        setLocation(coords);
        if (onLocationUpdate) {
          onLocationUpdate(coords);
        }
      },
      (err) => {
        setError(err.message);
        if (onError) {
          onError(err);
        }
      }
    );

    return watchIdRef.current;
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    location,
    error,
    loading,
    getLocation,
    startWatching,
    stopWatching,
    hasLocation: !!location
  };
};

export default useGeolocation;