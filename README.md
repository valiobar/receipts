# Receipt System

A real-time receipt printing and device management platform that receives webhook events from external systems, processes receipt data, and manages WebSocket connections with physical receipt printers.

## Overview

The Receipt System provides:
- Real-time receipt processing from external webhooks
- WebSocket-based communication with physical receipt printers
- Frontend dashboard for monitoring and querying receipts
- Device online/offline status tracking
- Command queue management for offline devices

## Technology Stack

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - REST API and static file serving
- **Socket.IO** - WebSocket server for device and client connections
- **MongoDB** + **Mongoose** - Data persistence
- **JWT** - Authentication

### Frontend
- **React** + **TypeScript**
- **Vite** - Build tool and bundler
- **Socket.io-client** - WebSocket client
- **TailwindCSS** - Styling
- **React Router** - Client-side routing

### Infrastructure
- **MongoDB** - Database
- **Docker** (optional) - Containerization

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MongoDB** >= 5.x (local or remote instance)
- **Git**

## Project Structure

```
receipts/
├── frontend/                 # React frontend application
│   ├── src/                  # Source files
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API and WebSocket services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # State management
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   ├── dist/                # Vite build output
│   ├── vite.config.ts       # Vite configuration
│   └── package.json
├── server/                  # Node.js backend application
│   ├── src/                 # TypeScript source files
│   │   ├── controllers/     # Route controllers
│   │   ├── services/        # Business logic services
│   │   ├── models/          # MongoDB models
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   └── server.ts        # Server entry point
│   ├── public/              # Serves built frontend (copied from frontend/dist/)
│   ├── dist/                # Compiled JavaScript
│   └── package.json
├── documentation/           # Architecture and API documentation
│   ├── ARCHITECTURE.md      # System architecture
│   ├── COMMUNICATION_PROTOCOL.md  # WebSocket protocol
│   └── REST_API.md          # REST API documentation
├── package.json             # Root package.json with build scripts
└── README.md
```

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd receipts
```

### 2. Install dependencies

```bash
# Install root dependencies (dev tools)
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../server
npm install
```

### 3. Environment Setup

Create environment files for both frontend and backend:

**Server `.env` file** (`server/.env`):

Copy the example file and fill in your values:
```bash
cp server/env.example server/.env
```

Then edit `server/.env` with your configuration. See `server/env.example` for detailed descriptions of each variable, including how to obtain BRP API credentials.

**Frontend `.env` file** (`frontend/.env`):
```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

**Note:** Vite uses `VITE_` prefix for environment variables. These are embedded at build time.

## Development

### Start Development Server

From the project root:

```bash
npm run dev
```

This command:
- Starts frontend in watch mode (Vite rebuilds on file changes)
- Starts backend in watch mode (TypeScript auto-restarts on changes)
- Automatically copies frontend builds to `server/public/`

### Individual Commands

```bash
# Frontend only (watch mode)
npm run dev:frontend

# Backend only (watch mode)
npm run dev:backend

# Copy frontend build to server (watch mode)
npm run dev:copy
```

### Development Workflow

1. **Frontend Development**
   - Edit files in `frontend/src/`
   - Vite automatically rebuilds on save
   - Built files are copied to `server/public/`
   - Refresh browser to see changes

2. **Backend Development**
   - Edit files in `server/src/`
   - TypeScript compiler watches for changes
   - Server automatically restarts
   - API changes available immediately

3. **Full Stack Development**
   - Both frontend and backend run simultaneously
   - Hot reload enabled for both
   - WebSocket connections maintained during development

## Building for Production

### Build All

```bash
npm run build:all
```

This builds both frontend and backend, then copies the frontend build to the server's public directory.

### Individual Builds

```bash
# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend

# Copy frontend build to server
npm run deploy:copy
```

### Production Deployment

```bash
# Build and prepare for deployment
npm run deploy

# Start production server
npm start
```

## Running the Application

### Development Mode

```bash
npm run dev
```

Access the application at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3000

### Production Mode

```bash
# Build first
npm run deploy

# Then start
npm start
```

## API Documentation

### REST API

See [REST_API.md](./documentation/REST_API.md) for complete API documentation.

**Key Endpoints:**
- `POST /api/auth/login` - User authentication
- `GET /api/receipts` - Query receipts
- `GET /api/devices` - List devices
- `GET /webhook` - Webhook endpoint for external systems

### WebSocket Protocol

See [COMMUNICATION_PROTOCOL.md](./documentation/COMMUNICATION_PROTOCOL.md) for WebSocket message formats.

**WebSocket Endpoints:**
- `/ws/:deviceId` - Device connection endpoint
- `/client` - Frontend client connection endpoint

## Architecture

For detailed architecture documentation, see [ARCHITECTURE.md](./documentation/ARCHITECTURE.md).

### Key Components

1. **Webhook Handler** - Receives and processes external webhook calls
2. **Connection Manager** - Manages WebSocket connections (devices and clients)
3. **Command Service** - Manages command queue and processing
4. **Event Service** - Centralized event emission and handling
5. **Device Service** - Manages device information and status

### Data Flow

```
External System → Webhook → Event Service → Command Service → Connection Manager → Device
                                                      ↓
                                                 MongoDB
```

## Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd ../server
npm test
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t receipt .
```

### Run with Docker Compose

```bash
docker-compose up -d
```

See [ARCHITECTURE.md](./documentation/ARCHITECTURE.md) for Docker configuration details.

## Environment Variables

### Server Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `3000` |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRES_IN` | JWT expiration time | No | `24h` |
| `WEBHOOK_IPS` | Comma-separated IP whitelist | No | - |
| `BRP_API_URL` | BRP Event API base URL | No | - |
| `BRP_API_KEY` | BRP Event API authentication key | No | - |
| `BRP_WEBHOOK_URL` | Public URL where BRP should send webhooks | No | - |
| `BRP_WEBHOOK_SECRET` | Secret for webhook authentication | No | - |

### Frontend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL | Yes | - |
| `VITE_WS_URL` | WebSocket server URL | Yes | - |

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development mode (watch + auto-rebuild) |
| `npm run dev:frontend` | Frontend watch mode only |
| `npm run dev:backend` | Backend watch mode only |
| `npm run build:all` | Build both frontend and backend |
| `npm run deploy` | Build and prepare for deployment |
| `npm start` | Start production server |

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure code follows TypeScript strict mode
4. Test your changes
5. Submit a pull request

## Code Style

- **TypeScript**: Strict mode enabled, no `any` types
- **React**: Functional components only, hooks for side effects
- **Styling**: TailwindCSS utility classes
- **Naming**: PascalCase for components, camelCase for functions/variables

See workspace rules for detailed coding standards.

## License

[Add your license here]

## Support

For issues and questions, please open an issue in the repository.

