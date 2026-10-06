const express = require("express");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const { Pool } = require("pg");
require("dotenv").config();
const { supabase } = require("./supabase");
const { requireAuth } = require("./middleware/auth");

const swaggerDocument = JSON.parse(
  fs.readFileSync("./openapi.json", "utf8")
);

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// PostgreSQL Database
// ==============================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create table and seed only if empty
async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  const result = await pool.query(
    "SELECT COUNT(*) AS count FROM tasks"
  );

  if (parseInt(result.rows[0].count) === 0) {
    await pool.query(
      `
      INSERT INTO tasks (title, done)
      VALUES
        ($1, $2),
        ($3, $4),
        ($5, $6)
      `,
      [
        "Learn Express",
        false,
        "Build CRUD API",
        false,
        "Push to GitHub",
        true,
      ]
    );

    console.log("🌱 Database seeded with 3 tasks");
  }

  console.log("🐘 PostgreSQL database connected");
}

// ==============================
// Middleware
// ==============================

app.use(express.json());

// ==============================
// Swagger UI
// ==============================

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

// ==============================
// Root Endpoint
// ==============================

app.get("/", (req, res) => {
  res.status(200).json({
    name: "Task API",
    version: "3.0",
    storage: "PostgreSQL",
    endpoints: [
      "GET /",
      "GET /health",
      "GET /tasks",
      "GET /tasks/:id",
      "POST /tasks",
      "PUT /tasks/:id",
      "DELETE /tasks/:id",
      "POST /auth/signup",
      "POST /auth/login",
      "POST /auth/logout",
      "GET /protected/profile",
      "GET /protected/dashboard",
      "GET /public/info",
    ],
  });
});

// ==============================
// Health Endpoint
// ==============================

app.get("/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      db: "ok",
    });
  } catch (error) {
    next(error);
  }
});

// ==============================
// Public Info
// ==============================

app.get("/public/info", (req, res) => {
  res.status(200).json({
    message: "Welcome stranger! This info is public."
  });
});

// ==============================
// Auth - Sign Up
// ==============================

app.post("/auth/signup", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "User created successfully",
      user: data.user
    });
  } catch (error) {
    next(error);
  }
});

// ==============================
// Auth - Login
// ==============================

app.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error || !data.session) {
      return res.status(400).json({
        error: error?.message || "Login failed"
      });
    }

    res.status(200).json({
      access_token: data.session.access_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      user: data.user
    });
  } catch (error) {
    next(error);
  }
});

// ==============================
// Auth - Logout
// ==============================

app.post("/auth/logout", requireAuth, (req, res) => {
  // Access tokens are bearer credentials. After this protected request
  // succeeds, the client must discard its access token. We do not use a
  // service_role key or attempt to revoke tokens server-side.
  res.status(204).send();
});

// ==============================
// Protected Profile
// ==============================

app.get("/protected/profile", requireAuth, (req, res) => {
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    account_created_at: req.user.created_at
  });
});

// ==============================
// Protected Dashboard
// ==============================

app.get("/protected/dashboard", requireAuth, (req, res) => {
  res.status(200).json({
    message: "Welcome to your protected dashboard.",
    user_id: req.user.id,
    email: req.user.email
  });
});

// ==============================
// GET All Tasks
// ==============================

app.get("/tasks", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks ORDER BY id"
    );

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// ==============================
// GET Task By ID
// ==============================

app.get("/tasks/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(
      "SELECT * FROM tasks WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==============================
// POST Create Task
// ==============================

app.post("/tasks", async (req, res, next) => {
  try {
    const { title } = req.body;

    if (
      !title ||
      typeof title !== "string" ||
      title.trim() === ""
    ) {
      return res.status(400).json({
        error: "Title is required and must be a non-empty string",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO tasks (title, done)
      VALUES ($1, $2)
      RETURNING *
      `,
      [title.trim(), false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==============================
// PUT Update Task
// ==============================

app.put("/tasks/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { title, done } = req.body;

    if (
      title === undefined ||
      typeof title !== "string" ||
      title.trim() === ""
    ) {
      return res.status(400).json({
        error: "Title is required and must be a non-empty string",
      });
    }

    if (typeof done !== "boolean") {
      return res.status(400).json({
        error: "Done must be true or false",
      });
    }

    const result = await pool.query(
      `
      UPDATE tasks
      SET title = $1, done = $2
      WHERE id = $3
      RETURNING *
      `,
      [title.trim(), done, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==============================
// DELETE Task
// ==============================

app.delete("/tasks/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==============================
// 404 Handler
// ==============================

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// ==============================
// Global Error Handler
// ==============================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ==============================
// Start Server
// ==============================

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();