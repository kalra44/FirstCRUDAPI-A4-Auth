# Task API — A4 Authentication

A containerized CRUD API built with Node.js, Express, PostgreSQL, Docker, and Supabase Auth. This project keeps the A3 PostgreSQL CRUD API and adds secure authentication, JWT verification, reusable auth middleware, protected routes, and Swagger Bearer authentication.

## Features

- PostgreSQL CRUD API
- Supabase Auth signup and login
- JWT access-token verification
- Reusable Express authentication middleware
- Protected profile and dashboard routes
- Protected logout route
- Public information route
- Swagger UI with Bearer authorization
- Docker Compose with PostgreSQL 17
- Persistent PostgreSQL volume
- Input validation and parameterized SQL queries

## Prerequisites

- Docker Desktop
- Git
- A free Supabase project

## Supabase setup

Create a Supabase project and obtain its Project URL and API anon key. Put them in `.env`.

The backend uses the anon key with `supabase.auth.getUser(token)` to verify access tokens. Never put a Supabase `service_role` key in this project.

If email confirmation is enabled in Supabase, a new user may need to confirm their email before login succeeds.

## Environment variables

Copy `.env.example` to `.env` and fill in your Supabase values:

```env
PORT=3000
DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

`.env` is git-ignored and must never be committed.

## Run

```bash
docker compose up --build
```

API: `http://localhost:3000`

Swagger: `http://localhost:3000/docs`

Stop:

```bash
docker compose down
```

## Authentication flow

1. `POST /auth/signup` creates a Supabase user.
2. `POST /auth/login` returns an access token.
3. Send the token as `Authorization: Bearer <token>` to protected routes.
4. The reusable `requireAuth` middleware asks Supabase to verify the token.
5. Missing, malformed, invalid, or expired tokens return `401`.

## Endpoints

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/auth/signup` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/logout` | Bearer token |
| GET | `/public/info` | Public |
| GET | `/protected/profile` | Bearer token |
| GET | `/protected/dashboard` | Bearer token |
| GET | `/tasks` | Existing A3 route |
| GET | `/tasks/:id` | Existing A3 route |
| POST | `/tasks` | Existing A3 route |
| PUT | `/tasks/:id` | Existing A3 route |
| DELETE | `/tasks/:id` | Existing A3 route |
| GET | `/health` | Public |

## Authentication examples

### Sign up

```bash
curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"StrongPassword123!"}'
```

### Login

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"StrongPassword123!"}'
```

Copy the returned `access_token`.

### Protected profile

```bash
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Tampered token test

Change one character in the access token and call the same endpoint. The API should return `401` with `Invalid or expired token`.

### Protected dashboard

```bash
curl -i http://localhost:3000/protected/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Logout

```bash
curl -i -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

The API verifies the caller before returning `204`. The client should discard its access token after logout.

## Swagger

Open `http://localhost:3000/docs`, click **Authorize**, enter the access token, then use **Try it out** on the protected endpoints.

## Database

The existing A3 PostgreSQL `tasks` table is retained:

| Column | Type |
|---|---|
| id | SERIAL PRIMARY KEY |
| title | TEXT |
| done | BOOLEAN |

The database continues to use parameterized SQL queries and the named Docker volume `taskdata`.

## Stage 7 — AI vs me

Keep AI-generated code isolated from the hand-built submission in `ai-version/` or a separate Git branch. Compare the two versions and document at least three concrete differences in this README after running the AI version.

Suggested comparison points:

1. How token extraction handles the `Bearer ` prefix.
2. Whether invalid-token errors are safely handled as `401`.
3. Whether the AI introduces insecure secret handling, such as a service-role key.
4. What the prompt forgot to specify and what the AI decided itself.

## Project structure

```text
FirstCRUDAPI/
├── Dockerfile
├── compose.yaml
├── server.js
├── supabase.js
├── middleware/
│   └── auth.js
├── openapi.json
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── README.md
└── ai-version/
```
