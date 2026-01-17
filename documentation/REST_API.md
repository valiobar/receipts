# REST API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Receipts](#receipts-endpoints)
   - [Devices](#devices-endpoints)
   - [Reports](#reports-endpoints)
   - [Webhooks](#webhook-endpoints)
   - [System](#system-endpoints)
8. [Data Models](#data-models)
9. [Examples](#examples)
10. [SDK Examples](#sdk-examples)

---

## Overview

The Receipt System REST API provides programmatic access to receipt data, device management, and system operations. The API follows RESTful principles and uses JSON for data exchange.

**API Version:** 1.0  
**Protocol:** HTTP/HTTPS  
**Data Format:** JSON  
**Character Encoding:** UTF-8

---

## Base URL

### Production
```
https://api.fit.bg
```

### Development
```
http://localhost:3000
```

### Staging
```
https://staging-api.fit.bg
```

All endpoints are relative to the base URL unless otherwise specified.

---

## Authentication

### JWT Authentication

The API uses JSON Web Tokens (JWT) for authentication. Include the token in the `Authorization` header of all authenticated requests.

**Header Format:**
```
Authorization: Bearer {token}
```

### Obtaining a Token

1. **Login Endpoint:** `POST /api/auth/login`
2. Receive token in response
3. Store token securely (localStorage, sessionStorage, or secure cookie)
4. Include token in subsequent requests

### Token Expiration

- **Default Expiration:** 24 hours
- **Refresh:** Use refresh token endpoint before expiration
- **Expired Token:** Returns `401 Unauthorized`

### Token Format

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@example.com",
    "roles": ["Admin"]
  }
}
```

### Role-Based Access Control

| Role | Permissions |
|------|------------|
| `Admin` | Read receipts, view devices, generate reports |
| `Super` | All Admin permissions + debug endpoints, system restart |

---

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

### Error Response

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error details
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Authentication required or invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict (e.g., duplicate) |
| `422` | Unprocessable Entity | Validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | Service temporarily unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `AUTH_INVALID` | Invalid credentials |
| `AUTH_EXPIRED` | Token expired |
| `AUTH_INSUFFICIENT` | Insufficient permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE_ENTRY` | Duplicate resource |
| `DEVICE_OFFLINE` | Device not connected |
| `COMMAND_PENDING` | Command already pending |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Internal server error |

---

## Rate Limiting

### Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 1 minute |
| Webhook | 1000 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2024-01-15T10:31:00Z"
    }
  }
}
```

---

## API Endpoints

## Authentication Endpoints

### POST /api/auth/login

Authenticate user and receive JWT token.

**Authentication:** Not required

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Username (min 3 characters) |
| `password` | string | Yes | Password (min 6 characters) |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "admin",
      "email": "admin@example.com",
      "roles": ["Admin"]
    }
  }
}
```

**Response: 200 OK (Invalid Credentials)**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID",
    "message": "Incorrect username or password"
  }
}
```

**Response: 200 OK (Validation Error)**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the form for errors.",
    "details": {
      "username": "Please provide your username.",
      "password": "Password must have at least 6 characters."
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.fit.bg/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'
```

---

### POST /api/auth/refresh

Refresh JWT token before expiration.

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

**Response: 401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "Token expired"
  }
}
```

---

### POST /api/auth/logout

Invalidate current token (logout).

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  }
}
```

---

## Receipts Endpoints

### GET /api/receipts

Retrieve list of receipts with filtering and pagination.

**Authentication:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | string | No | Filter by device ID |
| `startDate` | string (ISO 8601) | No | Start date filter (e.g., "2024-01-01") |
| `endDate` | string (ISO 8601) | No | End date filter (e.g., "2024-01-31") |
| `userNumber` | string | No | Filter by user number |
| `status` | string | No | Filter by status (`pending`, `processed`) |
| `limit` | number | No | Results per page (default: 50, max: 100) |
| `offset` | number | No | Pagination offset (default: 0) |
| `sortBy` | string | No | Sort field (default: `ts`) |
| `sortOrder` | string | No | Sort order (`asc`, `desc`, default: `desc`) |

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "receipts": [
      {
        "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
        "device": "123",
        "amount": "2.76",
        "MembershipFee": "123.99",
        "userNumber": "123456",
        "location": "Bulgaria",
        "ip": "213.91.159.250",
        "Status": "processed",
        "ts": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 1523,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.fit.bg/api/receipts?deviceId=123&startDate=2024-01-01&limit=50" \
  -H "Authorization: Bearer {token}"
```

---

### GET /api/receipts/:id

Retrieve a specific receipt by ID.

**Authentication:** Required (Bearer token)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (ObjectId) | Yes | Receipt ID |

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "receipt": {
      "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
      "device": "123",
      "amount": "2.76",
      "MembershipFee": "123.99",
      "userNumber": "123456",
        "location": "Bulgaria",
      "ip": "213.91.159.250",
      "Status": "processed",
      "ts": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Response: 404 Not Found**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Receipt not found"
  }
}
```

---

### GET /api/receipts/export

Export receipts to Excel file.

**Authentication:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (ISO 8601) | Yes | Start date |
| `endDate` | string (ISO 8601) | Yes | End date |
| `deviceId` | string | No | Filter by device ID |
| `format` | string | No | Export format (`xlsx`, `csv`, default: `xlsx`) |

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK (File Download)**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="report-15-01-2024.xlsx"

[Excel file binary data]
```

**Response: 200 OK (JSON with filename)**
```json
{
  "success": true,
  "data": {
    "filename": "report-15-01-2024.xlsx",
    "downloadUrl": "/reports/report-15-01-2024.xlsx"
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.fit.bg/api/receipts/export?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer {token}" \
  -o report.xlsx
```

---

## Devices Endpoints

### GET /api/devices

Retrieve list of all devices with their status.

**Authentication:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `online` | boolean | No | Filter by online status |
| `location` | string | No | Filter by location name |

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
        "deviceId": "123",
        "name": "Bulgaria",
        "location": "Fitness Spa Bulgaria",
        "status": true,
        "online": true,
        "lastSeen": "2024-01-15T10:30:00Z",
        "metadata": {
          "firmwareVersion": "1.2.3",
          "model": "Fiscal Printer X1"
        }
      }
    ],
    "summary": {
      "total": 7,
      "online": 5,
      "offline": 2
    }
  }
}
```

---

### GET /api/devices/:id

Retrieve a specific device by ID.

**Authentication:** Required (Bearer token)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Device ID |

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "device": {
      "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
      "deviceId": "123",
      "name": "Bulgaria",
        "location": "Fitness Spa Bulgaria",
      "status": true,
      "online": true,
      "lastSeen": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

### GET /api/devices/:id/status

Get real-time status of a device.

**Authentication:** Required (Bearer token)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Device ID |

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "deviceId": "123",
    "online": true,
    "lastSeen": "2024-01-15T10:30:00Z",
    "status": "ready",
    "pendingCommands": 0,
    "lastCommand": {
      "id": "65a1b2c3d4e5f6a7b8c9d0e2",
      "type": "receipt",
      "status": "complete",
      "timestamp": "2024-01-15T10:25:00Z"
    }
  }
}
```

---

### POST /api/devices/:id/command

Send a command to a device.

**Authentication:** Required (Bearer token, Admin role)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Device ID |

**Request Body:**

**Daily Report:**
```json
{
  "type": "dailyReport"
}
```

**Period Report:**
```json
{
  "type": "periodReport",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Custom Command:**
```json
{
  "type": "customCommand",
  "commandId": "2A",
  "data": "C0C1C2C3"
}
```

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "commandId": "65a1b2c3d4e5f6a7b8c9d0e3",
    "deviceId": "123",
    "type": "dailyReport",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response: 400 Bad Request (Device Offline)**
```json
{
  "success": false,
  "error": {
    "code": "DEVICE_OFFLINE",
    "message": "Device is not connected. Command will be queued."
  }
}
```

---

## Reports Endpoints

### GET /api/reports

Get reports page (renders HTML view).

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK (HTML)**
```html
<!DOCTYPE html>
<html>
  <!-- Report page HTML -->
</html>
```

---

### POST /api/reports

Generate and download a report.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "deviceId": "123",
  "format": "xlsx"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (ISO 8601) | Yes | Start date |
| `endDate` | string (ISO 8601) | Yes | End date |
| `deviceId` | string | No | Filter by device ID |
| `format` | string | No | Export format (`xlsx`, `csv`) |

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "filename": "report-15-01-2024.xlsx",
    "downloadUrl": "/reports/report-15-01-2024.xlsx",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response: 400 Bad Request**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Start date and end date are required",
    "details": {
      "startDate": "Start date is required",
      "endDate": "End date is required"
    }
  }
}
```

---

## Webhook Endpoints

### GET /webhook

Receive webhook from external system for receipt processing.

**Authentication:** Not required (IP whitelist validation)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `isSuccess` | boolean | Yes | Transaction success flag |
| `message` | string | Yes | Semicolon-separated receipt data |

**Message Format:**
```
Club:{club_name};Zone:{zone};MembershipFee:{fee};UserNumber:{user_id};{device_id}
```

**Request Headers:**
```
x-real-ip: {client_ip_address}
```

**Response: 200 OK (Success)**
```json
{
  "success": true
}
```

**Response: 200 OK (Failure)**
```json
{
  "success": false
}
```

**Response: 403 Forbidden (IP Not Whitelisted)**
```json
{
  "success": false,
  "error": "Unauthorized IP address"
}
```

**cURL Example:**
```bash
curl -X GET "https://api.fit.bg/webhook?isSuccess=true&message=Club:Bulgaria;Zone:Fitness;MembershipFee:123.99;UserNumber:123456;123" \
  -H "x-real-ip: 213.91.159.250"
```

---

### POST /webhook/report

Receive report request webhook.

**Authentication:** Not required (IP whitelist validation)

**Request Body:**
```json
{
  "type": "daily",
  "device": "123"
}
```

**Request Body (Period Report):**
```json
{
  "type": "period",
  "device": "123",
  "startDate": "01-01-2024",
  "endDate": "31-01-2024"
}
```

**Request Body (Custom Command):**
```json
{
  "type": "cmd",
  "device": "123"
}
```

**Request Body (Daily X):**
```json
{
  "type": "daily-X",
  "device": "123"
}
```

**Request Body (Spad Naprejenie):**
```json
{
  "type": "spad-naprejenie",
  "device": "123"
}
```

**Request Headers:**
```
x-real-ip: {client_ip_address}
Content-Type: application/json
```

**Response: 200 OK**
```json
{
  "success": true
}
```

**cURL Example:**
```bash
curl -X POST https://api.fit.bg/webhook/report \
  -H "Content-Type: application/json" \
  -H "x-real-ip: 213.91.159.250" \
  -d '{
    "type": "daily",
    "device": "123"
  }'
```

---

## System Endpoints

### GET /api/system/status

Get system status and health information.

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 86400,
    "version": "1.0.0",
    "database": {
      "connected": true,
      "latency": 5
    },
    "devices": {
      "total": 7,
      "online": 5,
      "offline": 2
    },
    "commands": {
      "pending": 3,
      "processing": 1,
      "completed": 15230
    }
  }
}
```

---

### POST /api/system/restart

Restart the server (Super Admin only).

**Authentication:** Required (Bearer token, Super role)

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Server restart initiated"
  }
}
```

**Response: 403 Forbidden**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INSUFFICIENT",
    "message": "Super Admin role required"
  }
}
```

---

### GET /api/system/debug

Get debug information (Super Admin only).

**Authentication:** Required (Bearer token, Super role)

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "sockets": [
      {
        "location": "Bulgaria",
        "status": "CONNECTED",
        "closed": false,
        "id": "123"
      }
    ],
    "connections": {
      "devices": 5,
      "clients": 3
    }
  }
}
```

---

### GET /api/system/debug/socket/:socketId

Open/unlock a socket connection (Super Admin only).

**Authentication:** Required (Bearer token, Super role)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `socketId` | string | Yes | Socket/Device ID |

**Request Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Socket unlocked",
    "socketId": "123"
  }
}
```

---

## Data Models

### Receipt Model

```typescript
interface Receipt {
  _id: string;              // MongoDB ObjectId
  device: string;            // Device ID
  amount: string;            // Receipt amount
  MembershipFee: string;     // Membership fee
  userNumber: string;        // User identifier
  location: string;         // Location name
  ip: string;               // Webhook request IP
  Status: 'pending' | 'processed';
  ts: string;               // ISO 8601 timestamp
}
```

### Command Model

```typescript
interface Command {
  _id: string;              // MongoDB ObjectId
  commandType: 'receipt' | 'dailyReport' | 'monthlyReport' | 'customCmd';
  deviceId: string;
  userNumber?: string;
  status: 'pending' | 'complete' | 'error';
  amount?: string;
  membershipFee?: string;
  location?: string;
  webhookRequestIp?: string;
  clubReceiptN?: number;
  startDate?: string;       // ISO 8601
  endDate?: string;         // ISO 8601
  adminId?: string;
  customCmdId?: string;
  dataCmd?: string;
  tsProcessed?: string;      // ISO 8601
  ts: string;               // ISO 8601
}
```

### Device Model

```typescript
interface Device {
  _id: string;              // MongoDB ObjectId
  deviceId: string;         // Unique device identifier
  name: string;              // Device name
  location: string;          // Physical location
  status: boolean;           // Online/offline (cached)
  online: boolean;           // Real-time online status
  lastSeen?: string;         // ISO 8601
  metadata?: {
    firmwareVersion?: string;
    model?: string;
  };
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
}
```

### User Model

```typescript
interface User {
  _id: string;              // MongoDB ObjectId
  email: string;            // Unique email
  username: string;         // Unique username
  roles: string[];          // ['Admin', 'Super']
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}
```

### Pagination Model

```typescript
interface Pagination {
  total: number;            // Total number of items
  limit: number;            // Items per page
  offset: number;           // Current offset
  hasMore: boolean;         // Whether more items exist
}
```

---

## Examples

### Complete Authentication Flow

```bash
# 1. Login
curl -X POST https://api.fit.bg/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "user": { ... }
#   }
# }

# 2. Use token for authenticated request
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET https://api.fit.bg/api/receipts \
  -H "Authorization: Bearer $TOKEN"

# 3. Refresh token before expiration
curl -X POST https://api.fit.bg/api/auth/refresh \
  -H "Authorization: Bearer $TOKEN"

# 4. Logout
curl -X POST https://api.fit.bg/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

### Receipt Querying Examples

```bash
# Get all receipts
curl -X GET "https://api.fit.bg/api/receipts" \
  -H "Authorization: Bearer $TOKEN"

# Get receipts for specific device
curl -X GET "https://api.fit.bg/api/receipts?deviceId=123" \
  -H "Authorization: Bearer $TOKEN"

# Get receipts for date range
curl -X GET "https://api.fit.bg/api/receipts?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"

# Get receipts with pagination
curl -X GET "https://api.fit.bg/api/receipts?limit=20&offset=40" \
  -H "Authorization: Bearer $TOKEN"

# Export receipts to Excel
curl -X GET "https://api.fit.bg/api/receipts/export?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $TOKEN" \
  -o report.xlsx
```

### Device Management Examples

```bash
# Get all devices
curl -X GET "https://api.fit.bg/api/devices" \
  -H "Authorization: Bearer $TOKEN"

# Get specific device
curl -X GET "https://api.fit.bg/api/devices/123" \
  -H "Authorization: Bearer $TOKEN"

# Get device status
curl -X GET "https://api.fit.bg/api/devices/123/status" \
  -H "Authorization: Bearer $TOKEN"

# Send daily report command
curl -X POST "https://api.fit.bg/api/devices/123/command" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dailyReport"
  }'

# Send period report command
curl -X POST "https://api.fit.bg/api/devices/123/command" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "periodReport",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

### Webhook Examples

```bash
# Receipt webhook
curl -X GET "https://api.fit.bg/webhook?isSuccess=true&message=Club:Bulgaria;Zone:Fitness;MembershipFee:123.99;UserNumber:123456;123" \
  -H "x-real-ip: 213.91.159.250"

# Daily report webhook
curl -X POST https://api.fit.bg/webhook/report \
  -H "Content-Type: application/json" \
  -H "x-real-ip: 213.91.159.250" \
  -d '{
    "type": "daily",
    "device": "123"
  }'
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
class ReceiptAPI {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async login(username: string, password: string): Promise<User> {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.success) {
      this.token = data.data.token;
      return data.data.user;
    }
    throw new Error(data.error.message);
  }

  async getReceipts(params?: {
    deviceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ receipts: Receipt[]; pagination: Pagination }> {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(
      `${this.baseURL}/api/receipts?${query}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );

    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    throw new Error(data.error.message);
  }

  async getDevices(): Promise<Device[]> {
    const response = await fetch(`${this.baseURL}/api/devices`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    const data = await response.json();
    if (data.success) {
      return data.data.devices;
    }
    throw new Error(data.error.message);
  }

  async sendCommand(deviceId: string, command: {
    type: string;
    startDate?: string;
    endDate?: string;
    commandId?: string;
    data?: string;
  }): Promise<Command> {
    const response = await fetch(
      `${this.baseURL}/api/devices/${deviceId}/command`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
      }
    );

    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    throw new Error(data.error.message);
  }
}

// Usage
const api = new ReceiptAPI('https://api.fit.bg');
await api.login('admin', 'password123');
const receipts = await api.getReceipts({ deviceId: '123' });
const devices = await api.getDevices();
await api.sendCommand('123', { type: 'dailyReport' });
```

### Python

```python
import requests
from typing import Optional, Dict, List

class ReceiptAPI:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None

    def login(self, username: str, password: str) -> Dict:
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": username, "password": password}
        )
        data = response.json()
        if data["success"]:
            self.token = data["data"]["token"]
            return data["data"]["user"]
        raise Exception(data["error"]["message"])

    def get_receipts(self, **params) -> Dict:
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(
            f"{self.base_url}/api/receipts",
            params=params,
            headers=headers
        )
        data = response.json()
        if data["success"]:
            return data["data"]
        raise Exception(data["error"]["message"])

    def get_devices(self) -> List[Dict]:
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(
            f"{self.base_url}/api/devices",
            headers=headers
        )
        data = response.json()
        if data["success"]:
            return data["data"]["devices"]
        raise Exception(data["error"]["message"])

# Usage
api = ReceiptAPI("https://api.fit.bg")
api.login("admin", "password123")
receipts = api.get_receipts(deviceId="123", limit=50)
devices = api.get_devices()
```

---

## Best Practices

### 1. Error Handling

Always check the `success` field in responses:

```typescript
const response = await api.getReceipts();
if (response.success) {
  // Process data
  console.log(response.data.receipts);
} else {
  // Handle error
  console.error(response.error.message);
}
```

### 2. Token Management

- Store tokens securely
- Refresh tokens before expiration
- Handle 401 errors by re-authenticating
- Never expose tokens in logs or client-side code

### 3. Pagination

Always use pagination for large datasets:

```typescript
let offset = 0;
const limit = 50;
let hasMore = true;

while (hasMore) {
  const response = await api.getReceipts({ limit, offset });
  // Process receipts
  offset += limit;
  hasMore = response.pagination.hasMore;
}
```

### 4. Rate Limiting

- Respect rate limit headers
- Implement exponential backoff
- Cache responses when appropriate
- Batch requests when possible

### 5. Date Formatting

Always use ISO 8601 format for dates:

```typescript
const startDate = new Date().toISOString().split('T')[0]; // "2024-01-15"
```

---

## Changelog

### Version 1.0 (2024-01-15)

- Initial API release
- Authentication endpoints
- Receipts endpoints
- Devices endpoints
- Reports endpoints
- Webhook endpoints
- System endpoints

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Maintained By:** Development Team

