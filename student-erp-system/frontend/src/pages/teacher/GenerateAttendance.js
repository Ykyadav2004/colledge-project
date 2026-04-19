import React, { useState, useEffect, useCallback } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { attendanceAPI, courseAPI } from '../../services/api';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const GenerateAttendance = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [radius, setRadius] = useState(30);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { location, getLocation, error: locationError, loading: locationLoading } = useGeolocation();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await courseAPI.getCourses();
      setCourses(response.data.courses);
      if (response.data.courses.length > 0) {
        setSelectedCourse(response.data.courses[0]._id);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let teacherLocation;
      try {
        teacherLocation = await getLocation();
      } catch (err) {
        setError('Could not get your location. Please enable location services.');
        setLoading(false);
        return;
      }

      const response = await attendanceAPI.generateCode({
        courseId: selectedCourse,
        radiusMeters: parseInt(radius),
        teacherLocation: {
          latitude: teacherLocation.latitude,
          longitude: teacherLocation.longitude
        }
      });

      setSession(response.data.session);
      setSuccess(`Code generated: ${response.data.session.code}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code);
    }
  };

  return (
    <div className="generate-attendance-container">
      <div className="card">
        <h2>Generate Attendance Code</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {!session && (
          <form onSubmit={handleGenerateCode}>
            <div className="form-group">
              <label>Select Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                required
                disabled={loading || courses.length === 0}
              >
                {courses.length === 0 ? (
                  <option>No courses available</option>
                ) : (
                  courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.code} - {course.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label>Allowed Radius (meters)</label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                min={10}
                max={100}
                required
              />
              <small>Students must be within this distance from your location</small>
            </div>

            <div className="location-info">
              <span>Your Location:</span>
              {location ? (
                <span className="location-acquired">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
              ) : locationLoading ? (
                <span className="location-loading">Acquiring...</span>
              ) : locationError ? (
                <span className="location-error">{locationError}</span>
              ) : (
                <span>Not acquired</span>
              )}
            </div>

            <button type="submit" disabled={loading || locationLoading || courses.length === 0}>
              {loading ? 'Generating...' : 'Generate Code'}
            </button>
          </form>
        )}

        {session && (
          <div className="generated-code">
            <div className="code-display">
              <span className="code-label">Attendance Code</span>
              <span className="code-value">{session.code}</span>
              <button onClick={copyToClipboard} className="copy-btn">
                Copy
              </button>
            </div>

            <div className="session-details">
              <div className="detail-row">
                <span>Course:</span>
                <span>{selectedCourse}</span>
              </div>
              <div className="detail-row">
                <span>Radius:</span>
                <span>{session.radiusMeters}m</span>
              </div>
              <div className="detail-row">
                <span>Expires:</span>
                <span>{new Date(session.expiresAt).toLocaleTimeString()}</span>
              </div>
              <div className="detail-row">
                <span>Min Duration:</span>
                <span>{session.minDurationMinutes} minutes</span>
              </div>
            </div>

            <button
              onClick={() => setSession(null)}
              className="secondary-btn"
            >
              Generate New Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateAttendance;