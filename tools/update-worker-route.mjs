import fs from 'node:fs';

const filePath = 'C:/Users/ijk11/forceracing-website/worker/index.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  if (path === '/pitwall' || path === '/pit-wall') {
    url.pathname = '/portal';
    return Response.redirect(url.toString(), 302);
  }`;

const replacement = `  // Route /portal and /portal.html to static pit wall portal assets
  if (path === '/portal' || path === '/portal.html') {
    return env.ASSETS.fetch(request);
  }
  if (path === '/pitwall' || path === '/pit-wall') {
    url.pathname = '/portal';
    return Response.redirect(url.toString(), 302);
  }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated worker/index.js with test-compatible portal route');
} else {
  console.log('Target not found in worker/index.js');
}
