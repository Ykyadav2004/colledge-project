const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_M = 6371000;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
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

function isWithinRadius(studentLat, studentLon, teacherLat, teacherLon, radiusMeters) {
  const distance = haversineDistance(studentLat, studentLon, teacherLat, teacherLon);
  return distance.meters <= radiusMeters;
}

function calculateSpeed(prevLat, prevLon, prevTime, currLat, currLon, currTime) {
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

function isSuspiciousMovement(prevLat, prevLon, prevTime, currLat, currLon, currTime, maxSpeedKmH = 50) {
  const speed = calculateSpeed(prevLat, prevLon, prevTime, currLat, currLon, currTime);
  return speed.kmPerHour > maxSpeedKmH;
}

module.exports = {
  haversineDistance,
  isWithinRadius,
  calculateSpeed,
  isSuspiciousMovement,
  EARTH_RADIUS_KM,
  EARTH_RADIUS_M
};