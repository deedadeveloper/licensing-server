# Licensing Server

A lightweight, zero-dependency SaaS licensing backend and admin dashboard built with **native Node.js (`node:sqlite`)** and vanilla HTML/CSS. Designed to run offline-first, locally in Termux, or deployable to persistent infrastructure.

## Features

- **Zero External Dependencies:** Built entirely on Node.js core modules (`node:http`, `node:crypto`, `node:sqlite`).
- **Native SQLite Database:** Utilizes Node's built-in `DatabaseSync` for zero-configuration, lightning-fast data persistence.
- **Embedded Admin Dashboard:** Single-page vanilla UI featuring system health checks, key generation, expiration handling, one-tap clipboard copying, and live revocation controls.
- **Client Verification Sandbox:** Built-in endpoint and UI testing widget to validate active keys instantly.

## Endpoints

- `GET /` - Serves the admin dashboard.
- `GET /health` - System health check.
- `GET /api/licenses` - Lists all generated licenses.
- `POST /licenses` - Issues a new license key (`client_name`, optional `duration_days`).
- `GET /verify/:key` - Validates a license key status and expiration.
- `POST /revoke/:key` - Revokes an active license key.

## Quick Start

1. Clone the repository and run:
   ```bash
   node server.js
2. ​Open your browser at http://localhost:3000.
