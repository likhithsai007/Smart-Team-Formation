# Smart Team Formation Platform

A robust full-stack project built for academic hubs and hackathons, designed mathematically to eliminate the chaotic process of manual team formation. 

This platform intelligently matches students to optimal projects using a custom **AI Compatibility Engine**. Rather than relying on traditional message boards, students can declare their precise technical skill matrix and instantly receive highly compatible project recommendations. 

Alternatively, visionary students can step up as **Team Leads**, publish fully-realized project proposals, and rigorously review applications using empirical AI bottleneck algorithms that predict where the team might fail if communication or skill boundaries aren't bridged.

## 🚀 Key Features

- **Team Lead Approval Workflows**: Shift away from auto-joining. Project publishers command a bespoke *"Manage My Projects"* dashboard where they can manually review applicants, view their connected profiles, and officially accept/reject them.
- **AI Matchmaking Engine**: The application mathematically intersects a student's `1-5 Proficiency Scale` against a project's required skill vector.
- **Predictive Bottleneck Analysis**: Once a team starts forming, the system audits the accepted roster. It flags warnings such as `Missing Core Skills`, `Backend Overlap`, or `Communication Risks`, supplying AI-driven mitigation steps.
- **Dynamic GitHub Connectivity**: Every user profile is interconnected with live clickable GitHub nodes visible cleanly in application queues and active rosters.
- **Dark Neon Cyberpunk UI**: Engineered perfectly with standalone Vanilla CSS utilizing robust root variables to minimize latency and inject a hackathon-inspired aesthetic.

## 💻 Tech Stack

### Frontend
- **React 18** (Vite Build Tool)
- **Lucide-React** (Lightweight scalable icons)
- **Vanilla CSS** (Component-level isolation via CSS grid & flex architectures)

### Backend
- **Node.js runtime**
- **Express.js API Architecture** (RESTful endpoints mapping CRUD logic)
- **Custom Mathematical AI Module** (`ai_engine.js`) simulating matching constraints.
- **SQLite 3 persistent layer** (`database.sqlite`) driven natively through raw robust SQL queries ensuring zero ORM bottlenecking.

### Build/Development Flow
- **Concurrently**: Single terminal multi-process manager ensuring instantaneous synchronized booting.

## 🛠️ Setup Instructions

Ensure you have Node.js and npm installed locally on your system before proceeding.

### 1. Installation Flow

Since the project operates on a multi-repo architectural pattern encapsulated in a root space, you need to install the dependencies individually.

```bash
# Clone the repository
git clone https://github.com/likhithsai007/Smart-Team-Formation.git
cd Smart-Team-Formation

# Install Root-level execution wrappers
npm install

# Install Secure Backend Core
cd backend
npm install

# Install Frontend Interface
cd ../frontend
npm install
```

### 2. Execution

Instead of running two independent terminals, this project utilizes a concurrency node module wrapper to sync both architectures simultaneously. 

Navigate back to the absolute root directory of the project:
```bash
cd ..
npm run dev
```

The system will synchronously initialize the active `database.sqlite` layer mapping local sessions internally while mapping the frontend instantly to `localhost:5173`. 

### 3. Demo Mock Data Protocol
If you are testing the platform dynamically, start your root server, navigate to your browser, and at the bottom of the Login Screen select **"Generate Hardcoded Demo Data"**. This completely seeds the database with populated Team Leads, active GitHub accounts, and formed teams for you to experiment with natively.
