# Project Overview: OJT Tracker App

A full-stack application designed to help students track their On-the-Job Training (OJT) hours, tasks, and documentation. It features Google OAuth for authentication, a dashboard for managing training records, and the ability to export records as PDF reports.

## Architecture

- **Frontend:** React 19 application built with Vite and styled using Tailwind CSS 4.
- **Backend:** Node.js Express server using MongoDB (Mongoose) for data storage.
- **Authentication:** Google OAuth 2.0 (Client-side) and JWT (Server-side).
- **Storage:** Local file system for uploaded documentation (via Multer).

## Directory Structure

- `src/`: Frontend source code.
  - `pages/`: Application views (Login, Dashboard, Terms).
  - `App.jsx`: Main application component and routing logic.
  - `main.jsx`: Entry point for the React application.
- `backend/`: Server-side code.
  - `server.js`: Main Express server, API routes, and database configuration.
  - `uploads/`: Directory where documentation files are stored.
- `public/`: Static assets for the frontend.

## Building and Running

### Prerequisites
- Node.js and npm installed.
- MongoDB instance running (locally or via URI).
- Google Cloud Project with OAuth 2.0 Client ID.

### Environment Variables
The following environment variables are required (create a `.env` file in the `backend/` directory):

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
```

### Commands

#### Frontend
- `npm install`: Install dependencies.
- `npm run dev`: Start the development server (Vite).
- `npm run build`: Build for production.
- `npm run lint`: Run ESLint.

#### Backend
- `cd backend && npm install`: Install backend dependencies.
- `npm run dev`: Start the server with `nodemon`.
- `npm run start`: Start the server with `node`.

## Development Conventions

- **State Management:** Uses React `useState` and `useEffect` for local state and data fetching.
- **API Communication:** Uses `axios` for HTTP requests to the backend.
- **Styling:** Tailwind CSS 4 for utility-first styling.
- **Icons:** `lucide-react` for consistent iconography.
- **PDF Generation:** `jspdf` and `jspdf-autotable` are used to generate OJT reports on the client side.
- **File Uploads:** Handled via `multipart/form-data` and processed by `multer` on the backend.
