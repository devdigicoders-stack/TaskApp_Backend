# TaskApp Backend API

A Node.js + Express + MongoDB REST API for the TaskFlow app.

## Tech Stack
- Node.js + Express
- MongoDB (Mongoose)
- Firebase Admin SDK (Google Auth)
- JWT Authentication

## Setup

```bash
npm install
```

Create a `.env` file:
```
PORT=5001
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
NODE_ENV=development
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
FIREBASE_PROJECT_ID=your_project_id
```

## Run
```bash
npm run dev     # development
npm start       # production
```

## API Endpoints

| Route | Description |
|-------|-------------|
| POST /api/auth/register | Register user |
| POST /api/auth/login | Login user |
| POST /api/auth/google | Google Firebase login |
| GET /api/campaigns | List campaigns |
| POST /api/submissions/start/:id | Start a task |
| POST /api/submissions/submit/:id | Submit task completion |
| POST /api/withdrawals | Request withdrawal |
| GET /api/settings/public | Get coin rates |
