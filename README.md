# OJT Tracker App (v1.3.0)

A full-stack On-the-Job Training (OJT) duty hours management system built for students to log hours, document daily task completions, track achievement milestones, visualize skill competencies, and generate compliance-ready DTR PDF reports.

Designed with a modern, minimalist Sage & Emerald aesthetic in both Light and Dark modes.

---

## Features

### OJT Completion Date Forecaster & Streak Tracker
- **Pace Velocity Predictor**: Calculates projected target completion date using pure JavaScript working-day date arithmetic, skipping non-duty weekend days (Saturday & Sunday).
- **Daily Duty Streak**: Tracks consecutive days logged to encourage consistent daily habits.

### OJT Skill Competency Matrix Analytics
- **Task Domain Categorization**: Categorizes daily log entries into 5 skill pillars:
  - Development & Engineering
  - Documentation & Reports
  - Design & Prototyping
  - System Maintenance & Support
  - Administrative & Meetings
- **Skill Matrix Widget**: Renders visual percentage breakdown bars and highlights primary focus domains across all logged duty hours.

### Small Floating Circling Loading Modal
- **Contextual Loading Indicator**: Displays a floating centered loading modal popup with an animated circling spinner for data fetching, uploading, editing, and deleting records.

### Official 7-Column DTR PDF Report Export
- **Ascending Chronological Order**: Orders entries from earliest duty date at the top to latest duty log entry at the bottom.
- **7-Column Session Format**: `DATE`, `DAY`, `TIME IN`, `TIME OUT` (Morning session), `TIME IN`, `TIME OUT` (Afternoon session), and `Daily Hours`.
- **Zero-Overlap Student Profile Box**: Structured 2-column card for Student Info, Date Range, Total Worked Hours, and Progress Status.
- **3 Formal Signature Line Blocks**: Official approval blocks for Student Trainee, OJT Industry Supervisor, and Academic Coordinator.

### Smart Form Validations & Overnight Shift Support
- **Cross-Midnight Calculation**: Calculates overnight duty shifts (e.g. 8:00 PM to 6:00 AM = 10.0 hrs) accurately.
- **Overnight Shift Indicator**: Displays an overnight shift badge in the form and review popup.
- **Validation Guards**: Restricts future dates, enforces shift windows, caps file upload sizes at `< 2MB` per image, and warns on duplicate dates.

### Target Exceeded & Overtime Bonus
- **Uncapped Progress Percentage**: Displays completion percentages beyond 100% (e.g. `115% COMPLETED`).
- **Overtime Bonus Tracker**: Replaces remaining hours banner with a glowing `+X.X HRS OVERTIME BONUS` badge.
- **Shimmering Metallic Progress Bar**: Morphs into a gold-emerald gradient when requirement goals are fulfilled.

### Trainee Achievement Ranks
- Dynamic student rank badges powered by Lucide vector icons:
  - **Rookie Trainee** (0% - 24.9%)
  - **Dedicated Apprentice** (25% - 74.9%)
  - **OJT Specialist** (75% - 99.9%)
  - **Overachieving Master** (100%+)

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
- **Database**: MongoDB (Mongoose Schema)
- **Auth**: Google OAuth 2.0 + JSON Web Token (JWT)
- **File Processing**: Multer (`multipart/form-data`)

---

## Developer Credit Footer

Implemented across Login, Dashboard, and Terms pages:

`© 2026 OJT Tracker System • Developed by Alberto Rili`

---

## Installation & Local Development

### Prerequisites
- Node.js (v18+)
- MongoDB instance running locally or via MongoDB Atlas
- Google Cloud OAuth 2.0 Client ID

### Environment Configuration
Create a `.env` file inside the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ojt-tracker
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
```

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
npm --prefix backend install
```

### Start Development Server

```bash
# Start frontend (Vite)
npm run dev

# Start backend (Nodemon)
npm --prefix backend run dev
```

### Production Build & Lint Verification

```bash
# Run ESLint
npm run lint

# Build frontend production bundle
npm run build
```

---

## License

This project is open source and available under the [MIT License](LICENSE).
