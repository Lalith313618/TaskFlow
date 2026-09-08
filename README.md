# 🚀 TaskFlow – Intern & Task Management System

TaskFlow is a full-stack task management application designed for corporate managers and interns to track deliverables, monitor real-time task progress, communicate via built-in task threads, and submit work completion proofs with file and image attachments.

---

## ✨ Features

- **Role-Based Access Control (RBAC):**
  - **Manager Portal:** Assign tasks, track organizational deliverables, manage intern accounts, and review submitted work.
  - **Intern Dashboard:** View assigned tasks, filter by priority and status, discuss tasks with managers, and upload completion proof.
  - **Manager Registration Protection:** Backend-enforced secret access code required to register manager accounts.
- **Task Discussion & Real-Time Communication:**
  - Interactive communication thread attached directly to every task.
- **Work Submission & Completion Proof:**
  - Interns can upload project deliverables, notes, images, and documents.
  - Interactive modal image viewer for previewing attachments.
- **Responsive Mobile & Desktop Design:**
  - Mobile drawer navigation and responsive layouts optimized for all screen sizes.
- **Search, Filter & Sorting:**
  - Filter by priority (Low, Medium, High), status (Pending, In Progress, Completed), and search tasks by title.

---

## 🛠️ Tech Stack

- **Frontend:** Angular 19+ (Standalone Components, Signals & Zoneless change detection, Vanilla CSS)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JWT (JSON Web Tokens), bcryptjs
- **File Uploads:** Multer (Local static file storage)

---

## 📦 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas URI

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Update your .env configuration (PORT, MONGO_URI, JWT_SECRET, etc.)
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
ng serve
# Or to test on your local Wi-Fi / mobile device:
ng serve --host 0.0.0.0
```

Open (task-flow-lalith10.vercel.app) in your browser.
