import fs from 'node:fs';

const filePath = 'C:/Users/ijk11/forceracing-website/worker/index.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  if (path === '/portal' || path === '/pitwall' || path === '/pit-wall') {
    url.pathname = '/portal.html';
    return env.ASSETS.fetch(new Request(url.toString(), request));
  }`;

const replacement = `  if (path === '/pitwall' || path === '/pit-wall') {
    url.pathname = '/portal';
    return Response.redirect(url.toString(), 302);
  }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated worker/index.js routing');
} else {
  console.log('Target block not matched');
}
