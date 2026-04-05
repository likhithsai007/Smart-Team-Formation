function calculateCompatibility(userSkills, projectRequiredSkills) {
    if (!projectRequiredSkills || projectRequiredSkills.length === 0) return 100;
    
    let matchCount = 0;
    const userSkillNames = userSkills.map(s => s.skill.toLowerCase());
    
    projectRequiredSkills.forEach(reqSkill => {
        if (userSkillNames.includes(reqSkill.toLowerCase())) {
            matchCount++;
        }
    });
    
    return Math.round((matchCount / projectRequiredSkills.length) * 100);
}

function predictTeamIssues(teamMembersData, projectData) {
    const issues = [];
    
    const allSkills = new Set();
    
    teamMembersData.forEach(member => {
        member.skills.forEach(s => allSkills.add(s.skill.toLowerCase()));
    });
    
    // Issue 1: Skill Mismatch / Gap
    const missingSkills = projectData.required_skills.filter(reqSkill => !allSkills.has(reqSkill.toLowerCase()));
    
    if (missingSkills.length > 0) {
        issues.push({
            issue_type: "SKILL_GAP",
            description: `The team lacks critical skills for the project: ${missingSkills.join(', ')}.`,
            ai_mitigation: `Consider inviting a member with expertise in ${missingSkills.join(', ')} or utilize AI upskilling paths.`
        });
    }

    // Issue 2: Role Overflow (Redundancy)
    teamMembersData.forEach(member => {
        const uniqueSkills = member.skills.filter(s => {
            let othersHaveIt = false;
            teamMembersData.forEach(other => {
                if(other.id !== member.id && other.skills.some(os => os.skill.toLowerCase() === s.skill.toLowerCase())) othersHaveIt = true;
            });
            return !othersHaveIt;
        });
        
        if (uniqueSkills.length === 0 && member.skills.length > 0) {
            issues.push({
                issue_type: "REDUNDANCY",
                description: `Member ${member.name} has heavily overlapping skills with the rest of the team.`,
                ai_mitigation: `Assign ${member.name} a coordinating role or encourage specialization in a different area.`
            });
        }
    });

    // Issue 3: Potential Communication Bottleneck
    if (teamMembersData.length >= 4) {
        issues.push({
            issue_type: "COMMUNICATION_RISK",
            description: `Large team size (${teamMembersData.length}) increases the risk of siloed work and misalignment.`,
            ai_mitigation: `Implement daily stand-ups and utilize an integrated task board. AI recommends assigning a dedicated Project Manager.`
        });
    }
    
    if (issues.length === 0) {
         issues.push({
            issue_type: "NO_ISSUES_DETECTED",
            description: `Team formation looks extremely well balanced and structured.`,
            ai_mitigation: `Proceed with standard onboarding protocols.`
        });
    }

    return issues;
}

module.exports = { calculateCompatibility, predictTeamIssues };
