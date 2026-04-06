require('dotenv').config();
const express = require("express");
const cors = require("cors");
const firebase = require("firebase/compat/app");
require("firebase/compat/firestore");
const { calculateCompatibility, predictTeamIssues } = require("./ai_engine");

// Initializing Firebase Client SDK natively in Node Serverless
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const router = express.Router();

// --- Users & Auth ---
router.post("/register", async (req, res) => {
    const { name, password, github_repo } = req.body;
    try {
        const snapshot = await db.collection('users').where('name', '==', name).get();
        if (!snapshot.empty) return res.status(400).json({ error: "Username already exists" });

        const newDoc = await db.collection('users').add({ name, password, github_repo: github_repo || null, skills: [] });
        res.json({ id: newDoc.id, name, github_repo: github_repo || null, skills: [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/login", async (req, res) => {
    const { name, password } = req.body;
    try {
        const snapshot = await db.collection('users').where('name', '==', name).where('password', '==', password).get();
        if (snapshot.empty) return res.status(404).json({ error: 'Invalid name or password' });
        
        const userDoc = snapshot.docs[0];
        res.json({ id: userDoc.id, ...userDoc.data() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/users/:id/github", async (req, res) => {
    const { github_repo } = req.body;
    try {
        await db.collection('users').doc(req.params.id).update({ github_repo });
        const doc = await db.collection('users').doc(req.params.id).get();
        res.json({ id: doc.id, ...doc.data() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/skills", async (req, res) => {
    const { userId, skill, proficiency } = req.body;
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) throw new Error("User not found");
        
        let skills = userDoc.data().skills || [];
        skills.push({ id: Date.now().toString(), skill, proficiency });
        await userRef.update({ skills });
        
        res.json({ message: "Skill added" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Projects & Browsing ---
router.get("/projects", async (req, res) => {
    try {
        const snapshot = await db.collection('projects').get();
        let projects = [];
        for (let docSnap of snapshot.docs) {
            const p = { id: docSnap.id, ...docSnap.data() };
            const ownerSnap = await db.collection('users').doc(p.owner_id).get();
            if (ownerSnap.exists) {
                p.owner_name = ownerSnap.data().name;
                p.owner_github = ownerSnap.data().github_repo;
            }
            projects.push(p);
        }
        res.json(projects);
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post("/projects", async (req, res) => {
    const { name, description, required_skills, owner_id } = req.body;
    try {
        const pRes = await db.collection('projects').add({ name, description, required_skills, owner_id });
        const projectId = pRes.id;
        
        await db.collection('teams').add({ project_id: projectId, members: [owner_id], issues: [] });
        res.json({ message: "Project added and Team formed globally" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/recommendations/projects/:userId", async (req, res) => {
    const userId = req.params.userId;
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userSkills = (userDoc.data() && userDoc.data().skills) || [];
        
        const snapshot = await db.collection('projects').get();
        let recs = [];
        for (let docSnap of snapshot.docs) {
            const p = { id: docSnap.id, ...docSnap.data() };
            const ownerSnap = await db.collection('users').doc(p.owner_id).get();
            if (ownerSnap.exists) {
                p.owner_name = ownerSnap.data().name;
                p.owner_github = ownerSnap.data().github_repo;
            }
            const score = calculateCompatibility(userSkills, p.required_skills || []);
            recs.push({ project: p, compatibility_score: score });
        }
        recs.sort((a,b) => b.compatibility_score - a.compatibility_score);
        res.json(recs);
    } catch(e) { res.status(500).json({error: e.message}); }
});

// --- Team Application & Management ---
const generateTeamIssues = async (teamId, projectId) => {
    const teamDoc = await db.collection('teams').doc(teamId).get();
    const membersList = (teamDoc.data() && teamDoc.data().members) || [];
    const teamMembersData = [];
    
    for (const mId of membersList) {
        const uSnap = await db.collection('users').doc(mId).get();
        if(uSnap.exists) teamMembersData.push({ id: uSnap.id, ...uSnap.data() });
    }
    
    const pSnap = await db.collection('projects').doc(projectId).get();
    const predictedIssues = predictTeamIssues(teamMembersData, pSnap.data());
    await db.collection('teams').doc(teamId).update({ issues: predictedIssues });
};

router.post("/projects/:id/apply", async (req, res) => {
    const { userId } = req.body;
    const projectId = req.params.id;
    try {
        const pSnap = await db.collection('projects').doc(projectId).get();
        if (pSnap.data().owner_id === userId) return res.status(400).json({error: "You are the owner!"});

        const appSnap = await db.collection('project_applications')
            .where('project_id', '==', projectId)
            .where('user_id', '==', userId).get();
        if (!appSnap.empty) return res.status(400).json({error: "Already applied."});

        const teamSnap = await db.collection('teams').where('project_id', '==', projectId).get();
        if (!teamSnap.empty) {
            const team = teamSnap.docs[0].data();
            if (team.members && team.members.includes(userId)) return res.status(400).json({error: "Already in team."});
        }
        
        await db.collection('project_applications').add({ project_id: projectId, user_id: userId, status: 'pending' });
        res.json({ message: "Application sent to lead!" });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.get("/projects/manage/:ownerId", async (req, res) => {
    const ownerId = req.params.ownerId;
    try {
        const pSnap = await db.collection('projects').where('owner_id', '==', ownerId).get();
        const projects = [];
        
        for(let docSnap of pSnap.docs) {
            const p = { id: docSnap.id, ...docSnap.data() };
            p.members = [];
            p.applications = [];
            
            const teamSnap = await db.collection('teams').where('project_id', '==', p.id).get();
            if(!teamSnap.empty) {
                p.team_id = teamSnap.docs[0].id;
                const membersIds = teamSnap.docs[0].data().members || [];
                for (const mid of membersIds) {
                    const uSnap = await db.collection('users').doc(mid).get();
                    if(uSnap.exists) p.members.push({ id: uSnap.id, ...uSnap.data() });
                }
            }
            
            const appSnap = await db.collection('project_applications')
                .where('project_id', '==', p.id).where('status', '==', 'pending').get();
            
            for(let a of appSnap.docs) {
                const appData = a.data();
                const uSnap = await db.collection('users').doc(appData.user_id).get();
                if(uSnap.exists) {
                    p.applications.push({
                        app_id: a.id,
                        id: uSnap.id,
                        name: uSnap.data().name,
                        github_repo: uSnap.data().github_repo,
                        status: appData.status,
                        skills: uSnap.data().skills || []
                    });
                }
            }
            projects.push(p);
        }
        res.json(projects);
    } catch(e) { res.status(500).json({error: e.message}) }
});

router.post("/applications/:id/respond", async (req, res) => {
    const { action } = req.body;
    const appId = req.params.id;
    try {
        const appRef = db.collection('project_applications').doc(appId);
        const application = await appRef.get();
        if(!application.exists) return res.status(404).json({error: "Application not found"});
        
        const data = application.data();
        if (action === 'accept') {
            await appRef.update({ status: 'accepted' });
            const teamSnap = await db.collection('teams').where('project_id', '==', data.project_id).get();
            if (!teamSnap.empty) {
                const teamDoc = teamSnap.docs[0];
                const members = teamDoc.data().members || [];
                if (!members.includes(data.user_id)) members.push(data.user_id);
                await db.collection('teams').doc(teamDoc.id).update({ members });
                await generateTeamIssues(teamDoc.id, data.project_id);
            }
        } else {
            await appRef.update({ status: 'rejected' });
        }
        res.json({message: "Processed"});
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.delete("/teams/:teamId/members/:userId", async (req, res) => {
    try {
        const { teamId, userId } = req.params;
        const teamRef = db.collection('teams').doc(teamId);
        const teamDoc = await teamRef.get();
        
        let members = teamDoc.data().members || [];
        members = members.filter(id => id !== userId);
        await teamRef.update({ members });
        
        const projectId = teamDoc.data().project_id;
        const appSnap = await db.collection('project_applications').where('project_id', '==', projectId).where('user_id', '==', userId).get();
        for (let a of appSnap.docs) await db.collection('project_applications').doc(a.id).update({ status: 'rejected' });
        
        await generateTeamIssues(teamId, projectId);
        res.json({message: "Member removed"});
    } catch(e) { res.status(500).json({error:e.message}); }
});

router.delete("/projects/:id", async (req, res) => {
    const projectId = req.params.id;
    try {
        const teamSnap = await db.collection('teams').where('project_id', '==', projectId).get();
        for(let doc of teamSnap.docs) await db.collection('teams').doc(doc.id).delete();
        
        const appSnap = await db.collection('project_applications').where('project_id', '==', projectId).get();
        for(let a of appSnap.docs) await db.collection('project_applications').doc(a.id).delete();
        
        await db.collection('projects').doc(projectId).delete();
        res.json({message: "Project deleted globally."});
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.get("/teams", async (req, res) => {
    try {
        const snapshot = await db.collection('teams').get();
        const teams = [];
        for (let docSnap of snapshot.docs) {
            const t = { id: docSnap.id, ...docSnap.data() };
            const pSnap = await db.collection('projects').doc(t.project_id).get();
            t.project_name = pSnap.exists ? pSnap.data().name : "Unknown";
            
            t.membersList = [];
            for (let mId of t.members || []) {
                const uSnap = await db.collection('users').doc(mId).get();
                if(uSnap.exists) t.membersList.push({ id: uSnap.id, ...uSnap.data() });
            }
            t.members = t.membersList;
            teams.push(t);
        }
        res.json(teams);
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post("/seed", async (req, res) => { 
    // Seed using Client SDK calls (same structure as admin sdk)
    const cols = ['users', 'projects', 'teams', 'project_applications'];
    for(let col of cols) {
       const snap = await db.collection(col).get();
       for(let d of snap.docs) await db.collection(col).doc(d.id).delete();
    }
    
    const u1 = await db.collection('users').add({ name: 'Alice (Frontend)', password: '1234', github_repo: 'https://github.com/alice', skills: [ {id: '1', skill: 'React', proficiency: 4}, {id: '2', skill: 'CSS', proficiency: 5} ]});
    const u2 = await db.collection('users').add({ name: 'Bob (Backend)', password: '1234', github_repo: 'https://github.com/bob', skills: [ {id: '1', skill: 'Node.js', proficiency: 4}, {id: '2', skill: 'SQL', proficiency: 3} ]});
    const u3 = await db.collection('users').add({ name: 'Charlie (Designer)', password: '1234', github_repo: 'https://github.com/charlie', skills: [ {id: '1', skill: 'UI/UX Design', proficiency: 5} ]});
    
    const p1 = await db.collection('projects').add({ name: 'Campus Event Dashboard', description: 'A web app', required_skills: ["React", "Node.js", "SQL"], owner_id: u2.id });
    await db.collection('teams').add({ project_id: p1.id, members: [u2.id], issues: [] });
    
    res.json({ message: "Seeded Firebase DB successfully." });
});

// Vercel Serverless Mapping: Ensure both /api and raw routes are seamlessly handled
app.use("/api", router);
app.use("/", router);

// Export for Vercel Serverless
module.exports = app;
