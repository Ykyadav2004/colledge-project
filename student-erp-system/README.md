# Student ERP Attendance System with Anti-Proxy Geolocation

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Teacher       │     │   Student      │     │   MongoDB      │
│   Browser      │────▶│   Browser      │────▶│   Database    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        │
┌─────────────────┐     ┌─────────────────┐                    │
│   Node.js      │◀────│   Node.js      │◀───────────────────┘
│   Backend     │     │   Backend     │
└─────────────────┘     └─────────────────┘
        │
        ▼ (WebSocket)
┌─────────────────┐
│   Socket.io   │
│   Real-time   │
└─────────────────┘
```

## Prerequisites

- Node.js 18+
- MongoDB 6.0+
- npm or yarn

## Project Structure

```
student-erp-system/
├── backend/
│   ├── src/
│   │   ├── config/         # Database config
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/   # Auth middleware
│   │   ├── models/      # MongoDB schemas
│   │   ├── routes/      # API routes
│   │   ├── services/   # Business logic
│   │   └── utils/     # Haversine formula
│   ├── .env            # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/   # React components
    │   ├── context/    # Auth context
    │   ├── hooks/     # Custom hooks (geolocation)
    │   ├── pages/     # Page components
    │   ├── services/  # API calls
    │   ├── styles/    # CSS styles
    │   └── utils/     # Client-side utils
    ├── public/
    └── package.json
```

## Setup Instructions

### 1. Database Setup (MongoDB)

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0

# Or install MongoDB locally from https://www.mongodb.com/try/download/community
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file (already created with defaults)
# Update MONGODB_URI if needed

# Start backend
npm run dev
```

Backend runs on http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start frontend
npm start
```

Frontend runs on http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Attendance
- `POST /api/attendance/generate-code` - Generate attendance code (Teacher)
- `POST /api/attendance/verify-code` - Verify attendance code
- `POST /api/attendance/check-in` - Check in with location
- `POST /api/attendance/update-location` - Send location updates
- `GET /api/attendance/active-sessions` - List active sessions

### Courses
- `POST /api/courses` - Create course (Teacher)
- `GET /api/courses` - List courses

## Anti-Cheat Mechanisms

1. **Geofencing**: Students must be within a defined radius of the teacher's location
2. **Live Tracking**: Location is tracked continuously for 20-30 minutes after check-in
3. **Warning System**: 3 warnings for leaving the zone before cancellation
4. **Teleportation Detection**: Suspicious movement speed triggers automatic warnings
5. **Code Expiry**: Codes expire in 5 minutes
6. **One-time Use**: Each student can only mark attendance once per code

## Haversine Formula

The system uses the Haversine formula to calculate distance between two GPS coordinates:

```javascript
// Formula: Calculate great-circle distance
const R = 6371000; // Earth's radius in meters

const dLat = toRadians(lat2 - lat1);
const dLon = toRadians(lon2 - lon1);

const a = sin(dLat/2)² + cos(lat1) * cos(lat2) * sin(dLon/2)²;
const c = 2 * atan2(√a, √(1−a));

distance = R * c; // in meters
```

## Workflow

### Teacher Workflow
1. Login as teacher
2. Navigate to "Generate Code"
3. Grant location permission
4. System captures teacher's GPS location
5. Enter course and radius (e.g., 30 meters)
6. Click "Generate Code"
7. Share code with students (or display on projector)

### Student Workflow
1. Login as student
2. Navigate to "Mark Attendance"
3. Enter the attendance code
4. Grant location permission
5. System verifies student is within allowed radius
6. If inside → attendance marked as "present"
7. Continuous location tracking starts for 20-30 minutes
8. If student leaves zone → warning issued
9. After 3 warnings → attendance cancelled

## Environment Variables

| Variable | Default | Description |
|----------|---------|------------|
| PORT | 5000 | Server port |
| MONGODB_URI | localhost:27017/student_erp | MongoDB connection |
| JWT_SECRET | your-secret-key | JWT signing key |
| ATTENDANCE_CODE_EXPIRY_MINUTES | 5 | Code validity |
| ATTENDANCE_MIN_DURATION_MINUTES | 20 | Minimum time in zone |
| DEFAULT_RADIUS_METERS | 30 | Default allowed radius |
| MAX_WARNINGS | 3 | Warnings before cancellation |

## Security Considerations

1. Always change JWT_SECRET in production
2. Use HTTPS in production
3. Implement rate limiting
4. Add input validation/sanitization
5. Use secure cookies for JWT storage
6. Implement CSRF protection
7. Add request logging/monitoring
8. Use environment-specific configs

## Scaling Recommendations

1. Use Redis for session storage
2. Implement load balancer
3. Use CDN for static files
4. Add caching layer
5. Use WebSocket clustering
6. Implement horizontal scaling