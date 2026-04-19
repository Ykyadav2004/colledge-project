import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { attendanceAPI } from '../../services/api';
import { isWithinRadius, haversineDistance } from '../../utils/geolocation';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const AttendanceCodeEntry = () => {
  const [code, setCode] = useState('');
  const [session, setSession] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [distance, setDistance] = useState(null);
  const [timeInZone, setTimeInZone] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [maxWarnings] = useState(3);

  const { location, getLocation, startWatching, stopWatching, error: locationError } = useGeolocation();
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const checkInTimeRef = useRef(null);

  useEffect(() => {
    return () => {
      stopWatching();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let currentLocation;
      try {
        currentLocation = await getLocation();
        setLocationStatus('acquired');
      } catch (err) {
        setLocationStatus('error');
        setError('Location access denied. Please enable location services.');
        setLoading(false);
        return;
      }

      const response = await attendanceAPI.verifyCode({ code });
      const sessionData = response.data.session;

      if (sessionData) {
        const dist = haversineDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          sessionData.teacherLocation.latitude,
          sessionData.teacherLocation.longitude
        );

        if (dist.meters > sessionData.radiusMeters) {
          setError(`You are ${dist.meters}m away. Please move within ${sessionData.radiusMeters}m of your teacher.`);
          setLoading(false);
          return;
        }

        setSession(sessionData);
        setDistance(dist.meters);
        startCheckInProcess(sessionData, currentLocation);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const startCheckInProcess = async (sessionData, currentLocation) => {
    setProcessing(true);

    try {
      const checkInResponse = await attendanceAPI.checkIn({
        sessionId: sessionData.id,
        location: currentLocation
      });

      if (checkInResponse.data.success) {
        setAttendanceStatus('check-in-complete');
        checkInTimeRef.current = new Date();

        socketRef.current = io(SOCKET_URL);
        socketRef.current.emit('join-session', {
          sessionId: sessionData.id,
          userId: checkInResponse.config.headers.Authorization?.split(' ')[1],
          role: 'student'
        });

        startWatching(
          (newLocation) => {
            sendLocationUpdate(sessionData.id, newLocation);
          },
          (err) => {
            console.error('Location error:', err);
          }
        );

        timerRef.current = setInterval(() => {
          if (checkInTimeRef.current) {
            const elapsed = Math.floor((new Date() - checkInTimeRef.current) / 60000);
            setTimeInZone(elapsed);
          }
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in');
      setProcessing(false);
    }
  };

  const sendLocationUpdate = async (sessionId, currentLocation) => {
    try {
      const response = await attendanceAPI.updateLocation({
        sessionId,
        location: currentLocation
      });

      const data = response.data;

      if (data.warning) {
        setWarningCount(data.warningCount);
        if (socketRef.current) {
          socketRef.current.emit('warning', {
            sessionId,
            userId: 'current',
            warningCount: data.warningCount,
            message: data.message
          });
        }
      }

      if (data.success) {
        setDistance(data.distance);
        if (data.isValid === true) {
          setAttendanceStatus('valid');
          stopWatching();
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          if (socketRef.current) {
            socketRef.current.emit('attendance-marked', {
              sessionId,
              userId: 'current',
              status: 'present'
            });
          }
        }
      } else if (data.warningCount >= maxWarnings) {
        setAttendanceStatus('invalid');
        setError('Attendance cancelled due to excessive warnings');
        stopWatching();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    } catch (err) {
      console.error('Location update failed:', err);
    }
  };

  return (
    <div className="attendance-entry-container">
      <div className="card">
        <h2>Mark Attendance</h2>

        {error && <div className="error-message">{error}</div>}

        {attendanceStatus === 'valid' && (
          <div className="success-message">
            <h3>Attendance Marked!</h3>
            <p>You have successfully completed attendance for this session.</p>
          </div>
        )}

        {attendanceStatus === 'invalid' && (
          <div className="error-message">
            <h3>Attendance Cancelled</h3>
            <p>Your attendance was cancelled due to leaving the allowed zone.</p>
          </div>
        )}

        {!session && (
          <form onSubmit={handleVerifyCode}>
            <div className="form-group">
              <label>Attendance Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter code from teacher"
                required
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading || processing}>
              {loading ? 'Verifying...' : 'Submit Code'}
            </button>
          </form>
        )}

        {session && !attendanceStatus && (
          <div className="session-info">
            <h3>Session Active</h3>
            <div className="info-row">
              <span>Course:</span>
              <span>{session.course.name} ({session.course.code})</span>
            </div>
            <div className="info-row">
              <span>Distance:</span>
              <span>{distance}m / {session.radiusMeters}m allowed</span>
            </div>
            <div className="info-row">
              <span>Time in Zone:</span>
              <span>{timeInZone} / {session.minDurationMinutes} minutes</span>
            </div>
            <div className="info-row">
              <span>Warnings:</span>
              <span>{warningCount} / {maxWarnings}</span>
            </div>

            {warningCount > 0 && (
              <div className="warning-badge">
                Warning {warningCount}: Return to the allowed zone immediately!
              </div>
            )}

            <div className="location-status">
              <span className={`status-dot ${locationStatus === 'acquired' ? 'active' : ''}`}></span>
              <span>{locationStatus === 'acquired' ? 'Location tracking active' : ' Acquiring location...'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceCodeEntry;