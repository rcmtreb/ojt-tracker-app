# OJT Tracker App (v1.2.0)

A full-stack On-the-Job Training (OJT) duty hours management system built for students to log hours, document daily task completions, track achievement milestones, and generate compliance-ready DTR PDF reports.

Designed with a modern, minimalist Sage & Emerald aesthetic in both Light and Dark modes.

---

## Features

### Smart Form Validations
- **Shift Time Check**: Enforces valid shift windows and ensures break durations do not meet or exceed total shift minutes.
- **Future Date Guard**: Restricts date selection to today or earlier dates (`YYYY-MM-DD`).
- **File Upload Protection**: Enforces a `< 2MB` per image size limit and restricts uploads to supported image formats (`image/*`).
- **Duplicate Entry Warning**: Displays an inline warning if a log entry already exists for the selected date.

### Smart Overnight Shift Support
- **Cross-Midnight Calculation**: Automatically handles overnight shifts (e.g. 8:00 PM to 6:00 AM = 10 hrs) without false validation errors.
- **Overnight Badge**: Displays an Overnight Duty Shift indicator banner in the form and entry review popup.

### Target Exceeded & Overtime Bonus
- **Uncapped Progress Percentage**: Displays actual completion percentages beyond 100% (e.g. `115% COMPLETED`).
- **Overtime Bonus Tracker**: Replaces "0.0 HRS REMAINING" with a glowing `+X.X HRS OVERTIME BONUS` pill when target hours are surpassed.
- **Shimmering Metallic Progress Bar**: Morphs into a gold-emerald gradient when requirement goals are fulfilled.

### Trainee Achievement Ranks
- Dynamic student rank badges powered by Lucide vector icons:
  - **Rookie Trainee** (0% - 24.9%)
  - **Dedicated Apprentice** (25% - 74.9%)
  - **OJT Specialist** (75% - 99.9%)
  - **Overachieving Master** (100%+)

### 5-Record Table Pagination
- Compact Activity Log Records table displaying 5 records per page with a sleek pagination control bar (`Showing 1-5 of 24 records`), direct page selector buttons, and Previous/Next controls.

### DTR PDF Report Export
- Instant client-side PDF report generation featuring student details, accumulated duty hours, shift breakdowns, and task summaries powered by `jspdf` and `jspdf-autotable`.

---

## Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4 + Vanilla CSS Design Tokens
- **Icons**: Lucide React (`lucide-react`)
- **PDF Export**: `jspdf` & `jspdf-autotable`
- **Auth**: `@react-oauth/google`

### Backend
- **Server**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **File Uploads**: Multer (`multipart/form-data`)
- **Authentication**: JWT (JSON Web Tokens)

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance (Local or MongoDB Atlas)
- Google Cloud OAuth 2.0 Client ID

### 2. Installation

Install root dependencies (Frontend):
```bash
npm install
```

Install backend dependencies:
```bash
npm --prefix backend install
```

### 3. Environment Setup

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ojt-tracker
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Running Locally

Start Frontend (Vite dev server):
```bash
npm run dev
```

Start Backend (Express dev server with nodemon):
```bash
npm --prefix backend run dev
```

---

## Verification & Build Commands

Run ESLint:
```bash
npm run lint
```

Build production bundle:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

---

## Design Theme
The app features a custom Sage & Emerald color palette (`emerald-600`, `teal-600`, slate neutrals) designed for a calm, sleek, non-oversaturated modern look in both Light and Dark mode.
