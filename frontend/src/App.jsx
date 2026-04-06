import React, { useState, useEffect } from 'react';
import { Activity, Users, AlertTriangle, LogOut, CheckCircle, Plus, Globe, FolderPlus, Trash2, UserMinus, UserCheck, UserX } from 'lucide-react';

// Relative path forces React to fetch from the Vercel backend sitting on the same domain
const API_BASE = '/api';

const PREDEFINED_SKILLS = [
  "JavaScript", "Python", "Java", "C++", "C#", "React", "Node.js", "Express",
  "SQL", "MongoDB", "Data Analysis", "Machine Learning", "UI/UX Design",
  "HTML", "CSS", "TypeScript", "Docker", "AWS", "Git"
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    // Attempt to hydrate user from localStorage on initial boot
    const saved = localStorage.getItem('smart_team_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('smart_team_user') ? 'dashboard' : 'login';
  });
  const [authMode, setAuthMode] = useState('login');

  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [ownedProjects, setOwnedProjects] = useState([]);

  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regGithub, setRegGithub] = useState('');

  const [newSkill, setNewSkill] = useState('');
  const [newSkillProf, setNewSkillProf] = useState('3');
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjSkills, setNewProjSkills] = useState([]);

  useEffect(() => {
    if (currentUser) fetchData();
  }, [currentView, currentUser]);

  const fetchData = async () => {
    try {
      const pRes = await fetch(`${API_BASE}/projects`);
      setProjects(await pRes.json());

      const tRes = await fetch(`${API_BASE}/teams`);
      setTeams(await tRes.json());

      const rRes = await fetch(`${API_BASE}/recommendations/projects/${currentUser.id}`);
      setRecommendations(await rRes.json());

      const opRes = await fetch(`${API_BASE}/projects/manage/${currentUser.id}`);
      setOwnedProjects(await opRes.json());

      const uRes = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentUser.name, password: currentUser.password })
      });
      if (uRes.ok) setCurrentUser(await uRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const seedDatabase = async () => {
    try {
      await fetch(`${API_BASE}/seed`, { method: 'POST' });
      alert('Demo data seeded! Log in as "Bob (Backend)" with password "1234".');
    } catch (e) { console.error(e); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: loginName, password: loginPass })
      });
      if (res.ok) {
        const u = await res.json();
        u.password = loginPass;
        setCurrentUser(u);
        localStorage.setItem('smart_team_user', JSON.stringify(u));
        setCurrentView('dashboard');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Login failed.');
      }
    } catch (e) { console.error(e); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regPass) return alert("Required fields missing");
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, password: regPass, github_repo: null })
      });
      if (res.ok) {
        const u = await res.json();
        u.password = regPass;
        setCurrentUser(u);
        localStorage.setItem('smart_team_user', JSON.stringify(u));
        setCurrentView('dashboard');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Registration failed.');
      }
    } catch (e) { console.error(e); }
  };

  const updateGithub = async (e) => {
    e.preventDefault();
    if (!regGithub) return;
    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.id}/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_repo: regGithub })
      });
      if (res.ok) {
        const u = await res.json();
        u.password = currentUser.password;
        setCurrentUser(u);
        localStorage.setItem('smart_team_user', JSON.stringify(u));
        setRegGithub('');
      }
    } catch (e) { console.error(e); }
  };

  const addSkill = async (e) => {
    e.preventDefault();
    if (!newSkill || !newSkillProf || !currentUser) {
      alert("Please select a skill from the dropdown and assign a proficiency level before clicking Add!");
      return;
    }
    try {
      await fetch(`${API_BASE}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, skill: newSkill, proficiency: parseInt(newSkillProf) })
      });
      setNewSkill(''); setNewSkillProf('3');
      fetchData();
    } catch (e) { console.error(e); }
  };

  const addProject = async (e) => {
    e.preventDefault();
    if (!newProjName || newProjSkills.length === 0) return alert("Name & skills required.");
    try {
      await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjName, description: newProjDesc, required_skills: newProjSkills, owner_id: currentUser.id })
      });
      setNewProjName(''); setNewProjDesc(''); setNewProjSkills([]);
      fetchData();
      setCurrentView('manage');
    } catch (e) { console.error(e); }
  };

  const applyToProject = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok) alert("Application Sent to Team Lead!");
      else alert(data.error);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleApp = async (appId, action) => {
    try {
      await fetch(`${API_BASE}/applications/${appId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const removeMember = async (teamId, userId) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const deleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project? This will disband the team completely.")) return;
    try {
      await fetch(`${API_BASE}/projects/${projectId}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('smart_team_user');
    setCurrentView('login');
  };

  if (currentView === 'login') {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h1 style={{ color: 'var(--neon-cyan)', marginBottom: '2rem' }}>Smart Team Formation</h1>
        <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
          {authMode === 'login' ? (
            <>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--neon-green)', textTransform: 'none', textAlign: 'center' }}>Sign In</h2>
              <p className="text-dim" style={{ textAlign: 'center', fontSize: '0.9rem' }}>Welcome back! Log into your account.</p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                <input type="text" placeholder="Username (e.g. Alice)" required value={loginName} onChange={e => setLoginName(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '12px', borderRadius: '4px' }} />
                <input type="password" placeholder="Password" required value={loginPass} onChange={e => setLoginPass(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '12px', borderRadius: '4px' }} />
                <button className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Login to Dashboard</button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                Don't have an account? <span style={{ color: 'var(--neon-cyan)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setAuthMode('register')}>Register Here</span>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--neon-cyan)', textTransform: 'none', textAlign: 'center' }}>Create Account</h2>
              <p className="text-dim" style={{ textAlign: 'center', fontSize: '0.9rem' }}>Register to start joining projects.</p>
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                <input type="text" placeholder="Desired Username" required value={regName} onChange={e => setRegName(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '12px', borderRadius: '4px' }} />
                <input type="password" placeholder="Choose a Password" required value={regPass} onChange={e => setRegPass(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '12px', borderRadius: '4px' }} />
                <button className="btn btn-primary" style={{ borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)', marginTop: '0.5rem' }}>Register Account</button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                Already have an account? <span style={{ color: 'var(--neon-green)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setAuthMode('login')}>Sign In</span>
              </div>
            </>
          )}
          <hr style={{ borderColor: 'var(--border-subtle)', marginTop: '2rem', marginBottom: '1rem' }} />
          <button className="btn" style={{ width: '100%', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' }} onClick={seedDatabase}>Generate Hardcoded Demo Data</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="brand" style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.2rem', lineHeight: '1.4' }}>Smart Team Portal</h1>
        </div>
        <div className="nav-menu">
          <div className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>
            <Users className="nav-icon" /> My Profile
          </div>
          <div className={`nav-item ${currentView === 'manage' ? 'active' : ''}`} onClick={() => setCurrentView('manage')}>
            <FolderPlus className="nav-icon" /> Manage My Projects
          </div>
          <div className={`nav-item ${currentView === 'projects' ? 'active' : ''}`} onClick={() => setCurrentView('projects')}>
            <Globe className="nav-icon" /> All Projects
          </div>
          <div className={`nav-item ${currentView === 'ai' ? 'active' : ''}`} onClick={() => setCurrentView('ai')}>
            <Activity className="nav-icon" /> AI Recommendations
          </div>
          <div className={`nav-item ${currentView === 'issues' ? 'active' : ''}`} onClick={() => setCurrentView('issues')}>
            <AlertTriangle className="nav-icon" /> My Teams Analysis
          </div>
        </div>
        <div style={{ marginTop: 'auto', padding: '0 2rem' }}>
          <div className="nav-item" style={{ padding: '0.5rem 0', color: 'var(--text-dim)' }} onClick={handleLogout}>
            <LogOut className="nav-icon" /> Sign Out
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <span style={{ fontSize: '1.2rem', color: '#fff' }}>Welcome, <span style={{ color: 'var(--neon-green)' }}>{currentUser.name}</span></span>
        </div>

        <div className="content-area">
          {currentView === 'dashboard' && (
            <div className="view-dashboard">
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Personal Profile</h1>

              {currentUser.github_repo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--neon-cyan)' }}>
                  <Globe size={16} /> <a href={currentUser.github_repo} style={{ color: 'inherit', textDecoration: 'none' }} target="_blank" rel="noreferrer">{currentUser.github_repo}</a>
                </div>
              ) : (
                <div className="card" style={{ marginBottom: '2rem', maxWidth: '600px', borderLeft: '3px solid var(--neon-cyan)' }}>
                  <div className="card-title" style={{ textTransform: 'none', fontSize: '1.1rem' }}>Add Github Repo Link</div>
                  <form onSubmit={updateGithub} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <input type="text" placeholder="https://github.com/yourusername" value={regGithub} onChange={e => setRegGithub(e.target.value)} style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '10px' }} />
                    <button className="btn btn-primary" style={{ borderColor: 'var(--neon-green)', color: 'var(--neon-green)' }}>Save Link</button>
                  </form>
                </div>
              )}

              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>My Skills</h2>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                {currentUser.skills && currentUser.skills.length > 0 ? (
                  currentUser.skills.map(s => (
                    <span key={s.id} style={{ background: 'rgba(0,255,255,0.1)', color: 'var(--neon-cyan)', padding: '5px 12px', borderRadius: '4px', fontSize: '0.9rem', border: '1px solid var(--neon-cyan)' }}>
                      {s.skill} <span style={{ opacity: 0.5 }}>(Rating: {s.proficiency}/5)</span>
                    </span>
                  ))
                ) : <p className="text-dim">You haven't registered any skills yet! Add some below.</p>}
              </div>

              <div className="card" style={{ maxWidth: '600px' }}>
                <div className="card-title" style={{ textTransform: 'none', fontSize: '1.1rem' }}>Add a Skill</div>
                <form onSubmit={addSkill} style={{ display: 'flex', gap: '1.5rem', flexDirection: 'column' }}>
                  <div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Select a skill from the list:</p>
                    <select value={newSkill} onChange={e => setNewSkill(e.target.value)} style={{ width: '100%', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '10px' }}>
                      <option value="">-- Choose a Skill --</option>
                      {PREDEFINED_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Select your Skill Rating (1 = Beginner, 5 = Expert):</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <input type="range" min="1" max="5" value={newSkillProf} onChange={e => setNewSkillProf(e.target.value)} style={{ flex: 1 }} />
                      <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{newSkillProf} / 5</span>
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><Plus size={14} /> Add Skill to Profile</button>
                </form>
              </div>
            </div>
          )}

          {currentView === 'manage' && (
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Manage My Projects & Team Leads</h1>

              <div className="card" style={{ marginBottom: '2rem', borderLeft: '3px solid var(--neon-green)' }}>
                <div className="card-title" style={{ color: 'var(--neon-green)', textTransform: 'none', fontSize: '1.1rem' }}>Publish a New Project</div>
                <p className="text-dim" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Create a project. You will automatically become the Team Lead.</p>

                <form onSubmit={addProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input type="text" placeholder="Project Title" value={newProjName} onChange={e => setNewProjName(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '10px' }} />
                  <input type="text" placeholder="Project Description" value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '10px' }} />
                  <div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Select Required Skills:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                      {PREDEFINED_SKILLS.map(s => (
                        <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="checkbox" checked={newProjSkills.includes(s)} onChange={() => {
                            if (newProjSkills.includes(s)) setNewProjSkills(newProjSkills.filter(x => x !== s));
                            else setNewProjSkills([...newProjSkills, s]);
                          }} /> {s}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ background: 'var(--neon-green)', borderColor: 'var(--neon-green)', color: '#000', alignSelf: 'flex-start' }}><FolderPlus size={14} /> Publish Project</button>
                </form>
              </div>

              {ownedProjects.length === 0 ? <p className="text-dim">You don't own any projects yet.</p> : ownedProjects.map(p => (
                <div className="card" key={p.id} style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ color: '#fff', fontSize: '1.5rem', margin: 0 }}>{p.name}</h2>
                    <button className="btn" style={{ background: 'rgba(255,51,51,0.1)', color: 'var(--neon-red)', borderColor: 'var(--neon-red)', padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => deleteProject(p.id)}><Trash2 size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Delete Project</button>
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{p.description}</p>

                  {/* Active Members */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ color: 'var(--neon-cyan)', fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Active Team Members ({p.members?.length})</h3>
                    {p.members && p.members.length > 0 ? p.members.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.95rem' }}>
                            {m.name} {m.id === currentUser.id && <span style={{ color: 'var(--neon-green)', fontSize: '0.7rem' }}>(Team Lead)</span>}
                            {m.github_repo && <a href={m.github_repo} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}><Globe size={14} /></a>}
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                            {m.skills?.map(s => <span key={s.id} style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', background: 'rgba(0,255,255,0.1)', padding: '2px 5px', borderRadius: '2px' }}>{s.skill}</span>)}
                          </div>
                        </div>
                        {m.id !== currentUser.id && (
                          <button className="btn" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-dim)', padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => removeMember(p.team_id, m.id)}><UserMinus size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Remove</button>
                        )}
                      </div>
                    )) : <p className="text-dim" style={{ fontSize: '0.8rem' }}>No active members yet.</p>}
                  </div>

                  {/* Pending Applications */}
                  <div>
                    <h3 style={{ color: 'var(--neon-green)', fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Pending Applications ({p.applications?.length})</h3>
                    {p.applications && p.applications.length > 0 ? p.applications.map(a => (
                      <div key={a.app_id} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.95rem' }}>
                              {a.name}
                              {a.github_repo && <a href={a.github_repo} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}><Globe size={14} /></a>}
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Applicant Skills:</div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                              {a.skills?.map(s => <span key={s.id} style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', background: 'rgba(0,255,255,0.1)', padding: '2px 5px', borderRadius: '2px' }}>{s.skill} ({s.proficiency}/5)</span>)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button className="btn" style={{ background: 'rgba(57,255,20,0.1)', color: 'var(--neon-green)', borderColor: 'var(--neon-green)', padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleApp(a.app_id, 'accept')}><UserCheck size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Accept</button>
                            <button className="btn" style={{ background: 'rgba(255,51,51,0.1)', color: 'var(--neon-red)', borderColor: 'var(--neon-red)', padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleApp(a.app_id, 'reject')}><UserX size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Reject</button>
                          </div>
                        </div>
                      </div>
                    )) : <p className="text-dim" style={{ fontSize: '0.8rem' }}>No pending applications.</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentView === 'projects' && (
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>All Available Projects</h1>
              <p className="text-dim" style={{ marginBottom: '2rem' }}>Browse all projects created by other students. Apply to join their team.</p>
              <div className="grid">
                {projects.map(p => (
                  <div className="card" key={p.id} style={{ position: 'relative' }}>
                    <div className="card-title" style={{ color: '#fff', fontSize: '1.2rem', textTransform: 'none' }}>{p.name}</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Team Lead: {p.owner_name || 'Unknown'}
                      {p.owner_github && <a href={p.owner_github} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'flex', alignItems: 'center' }}><Globe size={14} /></a>}
                    </p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-dim)' }}>{p.description}</p>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <span className="text-cyan" style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>Skills Needed:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {(Array.isArray(p.required_skills) ? p.required_skills : []).map(s => (
                          <span key={s} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    {p.owner_id === currentUser.id ? (
                      <button className="btn" disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', border: 'none' }}>You are the Lead</button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => applyToProject(p.id)}>
                        Apply for Approval
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'ai' && (
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>AI Project Recommendations</h1>
              <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Our AI analyzes your selected skills and recommends projects where you'd be a perfect fit.
              </p>

              <div className="grid">
                {recommendations.length > 0 ? recommendations.map(req => (
                  <div className="card" key={req.project.id} style={{ borderLeft: `${req.compatibility_score > 50 ? '3px solid var(--neon-green)' : '3px solid var(--neon-cyan)'}` }}>
                    <div className="card-title" style={{ textTransform: 'none' }}>
                      <span style={{ color: '#fff', fontSize: '1.2rem' }}>{req.project.name}</span>
                      <span style={{ color: req.compatibility_score > 50 ? 'var(--neon-green)' : 'var(--neon-cyan)', fontSize: '1.2rem' }}>{req.compatibility_score}% Match!</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Team Lead: {req.project.owner_name || 'Unknown'}
                      {req.project.owner_github && <a href={req.project.owner_github} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'flex', alignItems: 'center' }}><Globe size={14} /></a>}
                    </p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-dim)' }}>{req.project.description}</p>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <span className="text-cyan" style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>Skills Comparison:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {req.project.required_skills.map(s => {
                          const match = currentUser.skills.some(userSkill => userSkill.skill.toLowerCase() === s.toLowerCase());
                          return (
                            <span key={s} style={{ background: match ? 'rgba(57, 255, 20, 0.1)' : 'rgba(255, 51, 51, 0.1)', color: match ? 'var(--neon-green)' : 'var(--neon-red)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                              {s} {match ? '✓' : '✗'}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {req.project.owner_id === currentUser.id ? (
                      <button className="btn" disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', border: 'none' }}>You are the Lead</button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => applyToProject(req.project.id)}>
                        Apply for Approval
                      </button>
                    )}
                  </div>
                )) : <p className="text-dim">No recommendations. Please go to the Profile tab and add skills first!</p>}
              </div>
            </div>
          )}

          {currentView === 'issues' && (
            <div className="view-issues">
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>My Active Teams & AI Analysis</h2>
              <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                This tab displays teams where your application was formally APPROVED, as well as teams you own.
              </p>

              {teams.filter(t => t.members.some(m => m.id === currentUser.id)).length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>You aren't part of any officially formed teams yet. Your applications may still be pending!</div>
              ) : teams.filter(t => t.members.some(m => m.id === currentUser.id)).map(team => (
                <div className="card" key={team.id} style={{ marginBottom: '2rem' }}>
                  <div className="card-title" style={{ color: 'var(--neon-cyan)', fontSize: '1.2rem', textTransform: 'none' }}>
                    Project: {team.project_name}
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <span className="text-cyan" style={{ fontSize: '0.8rem' }}>Official Members ({team.members.length}):</span>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {team.members.map(m => (
                        <span key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {m.name}
                          {m.github_repo && <a href={m.github_repo} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-green)', display: 'flex', alignItems: 'center' }}><Globe size={14} /></a>}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--neon-red)' }}>Predicted Team Bottlenecks</h3>

                  {team.issues && team.issues.length > 0 ? team.issues.map(issue => {
                    let issueClass = 'issue-card';
                    let Icon = AlertTriangle;
                    if (issue.issue_type === 'NO_ISSUES_DETECTED') { issueClass += ' success'; Icon = CheckCircle; }
                    else if (issue.issue_type === 'REDUNDANCY') { issueClass += ' info'; }

                    return (
                      <div className={issueClass} key={issue.id}>
                        <div className="issue-title"><Icon size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> {issue.issue_type.replace(/_/g, ' ')}</div>
                        <div className="issue-desc">{issue.description}</div>
                        <div className="issue-mitigation">
                          <Activity size={14} /> <span>Recommendation: {issue.ai_mitigation}</span>
                        </div>
                      </div>
                    )
                  }) : (
                    <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>No issues found. AI approves this team structure!</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
