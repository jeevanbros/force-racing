import fs from 'node:fs';

const content = fs.readFileSync('C:/Users/ijk11/forceracing-website/site/team.html', 'utf8');
const cardRegex = /<article class="builder-card">([\s\S]*?)<\/article>/g;
let match;
const team = [];
while ((match = cardRegex.exec(content)) !== null) {
  const card = match[1];
  const nameMatch = card.match(/<h3 class="builder-name">([\s\S]*?)<\/h3>/);
  const roleMatch = card.match(/<p class="builder-role">([\s\S]*?)<\/p>/);
  const subMatch = card.match(/<p class="builder-subsystem">([\s\S]*?)<\/p>/);
  const imgMatch = card.match(/<img src="([^"]+)"/);
  team.push({
    name: nameMatch ? nameMatch[1].trim() : '',
    role: roleMatch ? roleMatch[1].trim() : 'Team Member',
    subsystem: subMatch ? subMatch[1].trim() : '',
    photo: imgMatch ? imgMatch[1] : ''
  });
}
console.log(JSON.stringify(team, null, 2));
