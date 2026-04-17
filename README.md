# EventPass

EventPass is a full-stack college event ticketing and entry-management application built with React, TypeScript, Express, Prisma, and PostgreSQL. It supports role-based authentication, event creation, secure student registrations, organizer check-in verification, and a browser-based dashboard for both students and organizers.

## What is included

- JWT-based authentication for `STUDENT` and `ORGANIZER`
- React frontend for authentication, browsing events, student tickets, and organizer operations
- Organizer event creation
- Event listing and event detail lookup
- Organizer-specific event dashboard and event registration viewer
- Event status management (`UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED`)
- Student registration with capacity checks
- Organizer ticket check-in with event-level verification
- Prisma schema and project diagrams
- Explicit OOP entities and repository interfaces to reflect the class diagram more closely

## Project structure

```text
EventPass/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── controllers/
│   │   ├── lib/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
├── frontend/
│   ├── src/
│   └── package.json
├── README.md
├── idea.md
├── useCaseDiagram.md
├── sequenceDiagram.md
├── classDiagram.md
└── ErDiagram.md
```

## Setup

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Copy the backend environment file and update it with your values:

```bash
cp .env.example .env
```

3. Set up the database schema:

```bash
npx prisma generate
npx prisma db push
```

4. Start the backend server:

```bash
npm run dev
```

5. In a new terminal, install and start the frontend:

```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

The API runs on `http://localhost:5000` by default and the frontend runs on Vite's default local port.

## Main API endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Events

- `GET /api/events`
- `GET /api/events/my-events`
- `GET /api/events/:eventId`
- `GET /api/events/:eventId/registrations`
- `POST /api/events`
- `PATCH /api/events/:eventId/status`

### Registrations

- `POST /api/registrations/register`
- `GET /api/registrations/my-tickets`
- `POST /api/registrations/check-in`

## Example request bodies

### Register user

```json
{
  "name": "Aarav Sharma",
  "email": "aarav@example.com",
  "password": "secret123",
  "role": "STUDENT"
}
```

### Create event

```json
{
  "title": "Hackathon 2026",
  "description": "24-hour coding challenge",
  "date": "2026-05-01T10:00:00.000Z",
  "venue": "Main Auditorium",
  "maxCapacity": 150
}
```

### Register for event

```json
{
  "eventId": "event-uuid"
}
```

### Check in ticket

```json
{
  "eventId": "event-uuid",
  "ticketUUID": "ticket-uuid"
}
```

## Notes

- Diagram files were left unchanged.
- The backend uses a controller-service-repository structure with domain classes and repository interfaces to demonstrate OOP and clean architecture.
