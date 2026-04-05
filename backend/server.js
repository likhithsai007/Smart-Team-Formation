const express = require('express');
const cors = require('cors');
const { runAsync, getAsync, allAsync } = require('./db');
const { calculateCompatibility, predictTeamIssues } = require('./ai_engine');

const app = express();
app.use(cors());
app.use(express.json());

// --- Users & Auth ---
app.post('/api/register', async (req, res) => {
    const { name, password, github_repo } = req.body;
    try {
        const existing = await getAsync("SELECT * FROM users WHERE name = ?", [name]);
        if (existing) return res.status(400).json({ error: "Username already exists" });

        const uRes = await runAsync("INSERT INTO users (name, password, github_repo) VALUES (?, ?, ?)", [name, password, github_repo]);
        const newUser = await getAsync("SELECT * FROM users WHERE id = ?", [uRes.lastID]);
        newUser.skills = [];
        res.json(newUser);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
    const { name, password } = req.body;
    try {
        const user = await getAsync("SELECT * FROM users WHERE name = ? AND password = ?", [name, password]);
        if (!user) return res.status(404).json({ error: 'Invalid name or password' });
        user.skills = await allAsync("SELECT * FROM user_skills WHERE user_id = ?", [user.id]);
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:id/github', async (req, res) => {
    const { github_repo } = req.body;
    try {
        await runAsync("UPDATE users SET github_repo = ? WHERE id = ?", [github_repo, req.params.id]);
        const user = await getAsync("SELECT * FROM users WHERE id = ?", [req.params.id]);
        user.skills = await allAsync("SELECT * FROM user_skills WHERE user_id = ?", [req.params.id]);
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/skills', async (req, res) => {
    const { userId, skill, proficiency } = req.body;
    try {
        await runAsync("INSERT INTO user_skills (user_id, skill, proficiency) VALUES (?, ?, ?)", [userId, skill, proficiency]);
        res.json({ message: "Skill added" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Projects & Browsing ---
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await allAsync("SELECT projects.*, users.name as owner_name, users.github_repo as owner_github FROM projects LEFT JOIN users ON projects.owner_id = users.id");
        res.json(projects.map(p => ({
            ...p,
            required_skills: typeof p.required_skills === 'string' ? JSON.parse(p.required_skills) : p.required_skills
        })));
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/projects', async (req, res) => {
    const { name, description, required_skills, owner_id } = req.body;
    try {
        const pRes = await runAsync("INSERT INTO projects (name, description, required_skills, owner_id) VALUES (?, ?, ?, ?)", [name, description, JSON.stringify(required_skills), owner_id]);
        const projectId = pRes.lastID;
        // Instantly generate team led by owner
        const tRes = await runAsync("INSERT INTO teams (project_id) VALUES (?)", [projectId]);
        await runAsync("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", [tRes.lastID, owner_id]);
        res.json({ message: "Project added and Team formed globally" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/recommendations/projects/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const userSkills = await allAsync("SELECT * FROM user_skills WHERE user_id = ?", [userId]);
        const projects = await allAsync("SELECT projects.*, users.name as owner_name, users.github_repo as owner_github FROM projects LEFT JOIN users ON projects.owner_id = users.id");
        
        const recs = projects.map(p => {
            const reqSkills = typeof p.required_skills === 'string' ? JSON.parse(p.required_skills) : p.required_skills;
            const score = calculateCompatibility(userSkills, reqSkills);
            return { project: { ...p, required_skills: reqSkills }, compatibility_score: score };
        }).sort((a,b) => b.compatibility_score - a.compatibility_score);
        
        res.json(recs);
    } catch(e) { res.status(500).json({error: e.message}); }
});

// --- Team Application & Management ---
const generateTeamIssues = async (teamId, projectId) => {
    const members = await allAsync("SELECT user_id FROM team_members WHERE team_id = ?", [teamId]);
    const teamMembersData = [];
    for(let m of members) {
        const user = await getAsync("SELECT * FROM users WHERE id = ?", [m.user_id]);
        user.skills = await allAsync("SELECT * FROM user_skills WHERE user_id = ?", [m.user_id]);
        teamMembersData.push(user);
    }
    const project = await getAsync("SELECT * FROM projects WHERE id = ?", [projectId]);
    project.required_skills = JSON.parse(project.required_skills);
    
    const predictedIssues = predictTeamIssues(teamMembersData, project);
    await runAsync("DELETE FROM team_issues WHERE team_id = ?", [teamId]);
    for (let issue of predictedIssues) {
        await runAsync("INSERT INTO team_issues (team_id, issue_type, description, ai_mitigation) VALUES (?, ?, ?, ?)", [teamId, issue.issue_type, issue.description, issue.ai_mitigation]);
    }
};

app.post('/api/projects/:id/apply', async (req, res) => {
    const { userId } = req.body;
    try {
        const project = await getAsync("SELECT owner_id FROM projects WHERE id = ?", [req.params.id]);
        if(project.owner_id === userId) return res.status(400).json({error: "You are the owner!"});

        const pending = await getAsync("SELECT * FROM project_applications WHERE project_id = ? AND user_id = ?", [req.params.id, userId]);
        if (pending) return res.status(400).json({error: "You have already applied or been processed for this project."});

        const team = await getAsync("SELECT id FROM teams WHERE project_id = ?", [req.params.id]);
        if(team) {
            const inTeam = await getAsync("SELECT * FROM team_members WHERE team_id = ? AND user_id = ?", [team.id, userId]);
            if (inTeam) return res.status(400).json({error: "You are already an official team member."});
        }
        
        await runAsync("INSERT INTO project_applications (project_id, user_id, status) VALUES (?, ?, ?)", [req.params.id, userId, 'pending']);
        res.json({ message: "Application sent to lead!" });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.get('/api/projects/manage/:ownerId', async (req, res) => {
    const ownerId = req.params.ownerId;
    try {
        const projects = await allAsync("SELECT * FROM projects WHERE owner_id = ?", [ownerId]);
        for(let p of projects) {
            p.required_skills = JSON.parse(p.required_skills);
            const team = await getAsync("SELECT id FROM teams WHERE project_id = ?", [p.id]);
            p.team_id = team ? team.id : null;
            
            p.members = [];
            if(p.team_id) {
                p.members = await allAsync(`
                    SELECT users.id, users.name, users.github_repo 
                    FROM team_members JOIN users ON team_members.user_id = users.id 
                    WHERE team_id = ?
                `, [p.team_id]);
                for(let m of p.members) m.skills = await allAsync("SELECT * FROM user_skills WHERE user_id = ?", [m.id]);
            }
            
            p.applications = await allAsync(`
                SELECT project_applications.id as app_id, users.id, users.name, users.github_repo, project_applications.status
                FROM project_applications JOIN users ON project_applications.user_id = users.id
                WHERE project_id = ? AND status = 'pending'
            `, [p.id]);
            for(let a of p.applications) a.skills = await allAsync("SELECT * FROM user_skills WHERE user_id = ?", [a.id]);
        }
        res.json(projects);
    } catch(e) { res.status(500).json({error: e.message}) }
});

app.post('/api/applications/:id/respond', async (req, res) => {
    const { action } = req.body; // 'accept' or 'reject'
    const appId = req.params.id;
    try {
        const application = await getAsync("SELECT * FROM project_applications WHERE id = ?", [appId]);
        if(!application) return res.status(404).json({error: "Application not found"});
        
        if (action === 'accept') {
            await runAsync("UPDATE project_applications SET status = 'accepted' WHERE id = ?", [appId]);
            const team = await getAsync("SELECT id FROM teams WHERE project_id = ?", [application.project_id]);
            if(team) {
                await runAsync("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", [team.id, application.user_id]);
                await generateTeamIssues(team.id, application.project_id);
            }
        } else {
            await runAsync("UPDATE project_applications SET status = 'rejected' WHERE id = ?", [appId]);
        }
        res.json({message: "Application processed"});
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.delete('/api/teams/:teamId/members/:userId', async (req, res) => {
    try {
        const { teamId, userId } = req.params;
        await runAsync("DELETE FROM team_members WHERE team_id = ? AND user_id = ?", [teamId, userId]);
        const team = await getAsync("SELECT project_id FROM teams WHERE id = ?", [teamId]);
        await runAsync("UPDATE project_applications SET status = 'rejected' WHERE project_id = ? AND user_id = ?", [team.project_id, userId]);
        await generateTeamIssues(teamId, team.project_id);
        res.json({message: "Member removed"});
    } catch(e) { res.status(500).json({error:e.message}); }
});

app.delete('/api/projects/:id', async (req, res) => {
    const projectId = req.params.id;
    try {
        const team = await getAsync("SELECT id FROM teams WHERE project_id = ?", [projectId]);
        if(team) {
            await runAsync("DELETE FROM team_issues WHERE team_id = ?", [team.id]);
            await runAsync("DELETE FROM team_members WHERE team_id = ?", [team.id]);
            await runAsync("DELETE FROM teams WHERE id = ?", [team.id]);
        }
        await runAsync("DELETE FROM project_applications WHERE project_id = ?", [projectId]);
        await runAsync("DELETE FROM projects WHERE id = ?", [projectId]);
        res.json({message: "Project deleted globally."});
    } catch(e) { res.status(500).json({error: e.message}); }
});

// --- Team Analytics (Normal View) ---
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await allAsync(`
            SELECT teams.id, teams.status, projects.name as project_name 
            FROM teams JOIN projects ON teams.project_id = projects.id
        `);
        for (let t of teams) {
            t.members = await allAsync(`
                SELECT users.id, users.name, users.github_repo 
                FROM team_members JOIN users ON team_members.user_id = users.id 
                WHERE team_id = ?
            `, [t.id]);
            t.issues = await allAsync("SELECT * FROM team_issues WHERE team_id = ?", [t.id]);
        }
        res.json(teams);
    } catch(e) { res.status(500).json({error: e.message}); }
});

// --- Deprecated auto-team endpoint overridden ---
app.post('/api/teams', async (req, res) => { res.status(400).json({error: "Deprecated. Use apply system."}); });

// --- MOCK SEEDING ---
app.post('/api/seed', async (req, res) => {
    await runAsync("DELETE FROM project_applications");
    await runAsync("DELETE FROM team_issues");
    await runAsync("DELETE FROM team_members");
    await runAsync("DELETE FROM teams");
    await runAsync("DELETE FROM user_skills");
    await runAsync("DELETE FROM users");
    await runAsync("DELETE FROM projects");
    
    const users = [
        {name: 'Alice (Frontend)', github: 'https://github.com/alice-dev'}, 
        {name: 'Bob (Backend)', github: 'https://github.com/bob-backend'}, 
        {name: 'Charlie (Designer)', github: 'https://github.com/charlie-ux'}
    ];
    for(let u of users) await runAsync("INSERT INTO users (name, password, github_repo) VALUES (?, ?, ?)", [u.name, '1234', u.github]);
    
    const allUsers = await allAsync("SELECT * FROM users");
    const uIds = allUsers.map(u => u.id);
    
    await runAsync("INSERT INTO user_skills (user_id, skill, proficiency) VALUES (?, ?, ?)", [uIds[0], "React", 4]);
    await runAsync("INSERT INTO user_skills (user_id, skill, proficiency) VALUES (?, ?, ?)", [uIds[0], "CSS", 5]);
    await runAsync("INSERT INTO user_skills (user_id, skill, proficiency) VALUES (?, ?, ?)", [uIds[1], "Node.js", 4]);
    await runAsync("INSERT INTO user_skills (user_id, skill, proficiency) VALUES (?, ?, ?)", [uIds[1], "SQL", 3]);
    await runAsync("INSERT INTO user_skills (user_id, skill, proficiency) VALUES (?, ?, ?)", [uIds[2], "UI/UX Design", 5]);
    
    const p1 = await runAsync("INSERT INTO projects (name, description, required_skills, owner_id) VALUES (?, ?, ?, ?)", ["Campus Event Dashboard", "A web app to track student activities.", JSON.stringify(["React", "Node.js", "SQL"]), uIds[1]]);
    const t1 = await runAsync("INSERT INTO teams (project_id) VALUES (?)", [p1.lastID]);
    await runAsync("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", [t1.lastID, uIds[1]]); // Bob owns
    
    const p2 = await runAsync("INSERT INTO projects (name, description, required_skills, owner_id) VALUES (?, ?, ?, ?)", ["Dormitory Energy Analyzer", "Data system for energy analytics.", JSON.stringify(["Python", "Data Analysis", "MongoDB"]), uIds[0]]);
    const t2 = await runAsync("INSERT INTO teams (project_id) VALUES (?)", [p2.lastID]);
    await runAsync("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", [t2.lastID, uIds[0]]); // Alice owns
    
    res.json({ message: "Seeded mock data supporting Lead Approvals successfully." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
