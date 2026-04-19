const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_M = 6371000;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return {
    meters: Math.round(EARTH_RADIUS_M * c),
    kilometers: EARTH_RADIUS_KM * c
  };
}

export function isWithinRadius(studentLat, studentLon, teacherLat, teacherLon, radiusMeters) {
  const distance = haversineDistance(studentLat, studentLon, teacherLat, teacherLon);
  return distance.meters <= radiusMeters;
}

export function calculateSpeed(prevLat, prevLon, prevTime, currLat, currLon, currTime) {
  const distance = haversineDistance(prevLat, prevLon, currLat, currLon);
  const timeDiffSeconds = (currTime - prevTime) / 1000;

  if (timeDiffSeconds <= 0) return 0;

  const speedMetersPerSecond = distance.meters / timeDiffSeconds;
  const speedKmPerHour = (distance.kilometers / timeDiffSeconds) * 3600;

  return {
    metersPerSecond: speedMetersPerSecond,
    kmPerHour: speedKmPerHour
  };
}

export function isSuspiciousMovement(prevLat, prevLon, prevTime, currLat, currLon, currTime, maxSpeedKmH = 50) {
  const speed = calculateSpeed(prevLat, prevLon, prevTime, currLat, currLon, currTime);
  return speed.kmPerHour > maxSpeedKmH;
}

export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

export function watchLocation(callback, errorCallback) {
  if (!navigator.geolocation) {
    errorCallback(new Error('Geolocation is not supported by your browser'));
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      });
    },
    (error) => {
      errorCallback(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

export function clearWatch(watchId) {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
}