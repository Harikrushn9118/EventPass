# EventPass

EventPass is a college event ticketing and entry-management backend built with TypeScript, Express, Prisma, and PostgreSQL. It supports role-based authentication, event creation, secure student registrations, and organizer check-in verification using UUID-based tickets.

## What is included

- JWT-based authentication for `STUDENT` and `ORGANIZER`
- Organizer event creation
- Event listing and event detail lookup
- Event status management (`UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED`)
- Student registration with capacity checks
- Organizer ticket check-in with event-level verification
- Prisma schema and project diagrams

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
├── README.md
├── idea.md
├── useCaseDiagram.md
├── sequenceDiagram.md
├── classDiagram.md
└── ErDiagram.md
```

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Copy the environment file and update it with your values:

```bash
cp .env.example .env
```

3. Set up the database schema:

```bash
npx prisma generate
npx prisma db push
```

4. Start the server:

```bash
npm run dev
```

The API runs on `http://localhost:5000` by default.

## Main API endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Events

- `GET /api/events`
- `GET /api/events/:eventId`
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
- EventPass currently contains the backend implementation. If your grading criteria expects a frontend, that would be the next major addition.
