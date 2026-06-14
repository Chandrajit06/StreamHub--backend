# StreamHub Backend API

A production-ready REST API backend that replicates core YouTube features — user authentication, channel profiles, subscriptions, video management, and watch history — built with Node.js, Express, MongoDB, and Cloudinary.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (Access + Refresh Tokens) |
| File Storage | Cloudinary |
| File Uploads | Multer |
| Password Hashing | bcrypt |

---

## Features

- **User auth** — register, login, logout with HTTP-only cookie-based JWT
- **Token rotation** — short-lived access tokens + long-lived refresh tokens, rotated on each refresh
- **Channel profiles** — subscriber count, subscribed-to count, and live `isSubscribed` status via MongoDB aggregation
- **Watch history** — full video + owner details fetched in a single nested aggregation pipeline
- **Avatar & cover image** — upload to Cloudinary via Multer; old assets are cleaned up on update
- **Account management** — update name, email, avatar, cover image, or password independently
- **Protected routes** — JWT middleware (`verifyJWT`) guards all sensitive endpoints

---

## Project Structure

```
src/
├── controllers/
│   └── user.controller.js      # All user-related business logic
├── middlewares/
│   ├── auth.middleware.js       # JWT verification
│   └── multer.middleware.js     # File upload handling
├── models/
│   ├── user.model.js            # User schema + bcrypt + JWT methods
│   └── video.model.js           # Video schema with aggregate-paginate plugin
├── routes/
│   └── user.routes.js           # Route definitions
└── utils/
    ├── asyncHandler.js          # Async error wrapper
    ├── apiError.js              # Custom error class
    ├── apiResponse.js           # Consistent response shape
    └── cloudinary.js            # Upload + delete helpers
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Cloudinary account

### Installation

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net
CORS_ORIGIN=*

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d

REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Authentication Flow

```
Register / Login
      │
      ▼
Generate accessToken (short-lived) + refreshToken (long-lived)
      │
      ├── accessToken  → HTTP-only cookie + JSON response
      └── refreshToken → HTTP-only cookie + saved in DB
      
Protected Request
      │
      ▼
verifyJWT middleware reads cookie (or Authorization: Bearer <token>)
      │
      ▼
Decodes token → finds user → attaches to req.user → next()

Token Expired
      │
      ▼
POST /refresh-token → verifies refreshToken against DB copy
      │
      ▼
Issues new accessToken + new refreshToken (rotation)
```

---

## Key Implementation Notes

**Refresh token rotation** — every call to `/refresh-token` issues a brand new refresh token and invalidates the old one in the database, limiting the damage from token theft.

**Aggregation pipelines** — channel profiles and watch history use multi-stage MongoDB aggregation with nested `$lookup` pipelines, avoiding N+1 query problems.

**Cloudinary cleanup** — when a user updates their avatar or cover image, the old Cloudinary asset is deleted after the new upload succeeds, preventing unbounded storage growth.

**Cookie security** — all auth cookies are `httpOnly` and `secure`, making them inaccessible to JavaScript and ensuring HTTPS-only transmission.

---

## 📄 License

This project is open source and available for further improvements.