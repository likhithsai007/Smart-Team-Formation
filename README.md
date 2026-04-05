# Smart Team Formation Platform

A full-stack React and Express.js web application designed to help students officially form project teams based on an AI Compatibility Engine. Students can add their skills, publish projects (becoming Team Leads), and apply for approvals to join other projects. The custom AI Engine will instantly predict potential team bottlenecks and mitigate risks based on missing skills.

## Features
- **Project Publishing & Application**: Create a project and accept/reject applicants directly.
- **AI Matchmaking**: Algorithmically calculates compatibility scores against project requirements.
- **Skill Matrices**: Profile building with 1-5 proficiency indexing for precise recommendation pairing.
- **Team Defense Analysis**: Detects gaps in team skillsets alerting leads to missing core requirements.
- **Dark Neon Cyberpunk UI**: Built flawlessly with Vanilla CSS to minimize latency.

## Setup Instructions

Make sure you have Node.js installed.

### 1. Database & Backend Setup
```bash
cd backend
npm install
npm start
```
The server will boot on `localhost:5000` using a local SQLite persistence file. 

### 2. Frontend Development Server
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to the provided localhost URL (e.g., `http://localhost:5173/`) in your browser.

## Using Git

This repository contains both a frontend and backend component. A `.gitignore` has been provided to keep unneeded build artifacts and local development SQLite database files out of version control.
