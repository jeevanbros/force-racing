import { execSync } from 'node:child_process';

const LIVE_URL = 'https://force-racing.force-racing-revival.workers.dev';
const testEmail = `live-test-${Date.now()}@forceracing.in`;
const testName = 'Live Verification Tester';

console.log(`Starting Live E2E Integration Test against ${LIVE_URL}`);
console.log(`Test Email: ${testEmail}`);

async function run() {
  // Step 1: Request access
  console.log('\n--- Step 1: Request Access ---');
  const reqRes = await fetch(`${LIVE_URL}/api/checker/request-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      phone: '9876543210',
      organization: 'Integration Squad',
      reason: 'E2E Deployment Verification'
    })
  });
  const reqData = await reqRes.json();
  console.log('Status code:', reqRes.status);
  console.log('Response body:', reqData);
  if (!reqRes.ok || !reqData.ok) throw new Error('Request access failed');

  // Step 2: Verify status is 'pending'
  console.log('\n--- Step 2: Verify Status is Pending ---');
  const statusPendingRes = await fetch(`${LIVE_URL}/api/checker/status?email=${encodeURIComponent(testEmail)}`);
  const statusPendingData = await statusPendingRes.json();
  console.log('Status code:', statusPendingRes.status);
  console.log('Response body:', statusPendingData);
  if (statusPendingData.status !== 'pending') {
    throw new Error(`Expected status pending, got: ${statusPendingData.status}`);
  }
  console.log('Verified: /api/checker/status returns status: "pending"');

  // Step 3: Fetch the decision token from D1
  console.log('\n--- Step 3: Fetch Decision Token from Remote D1 ---');
  const d1Output = execSync(
    `npx wrangler d1 execute DB --remote --command "SELECT token FROM checker_accounts WHERE email='${testEmail}';" --json`,
    { encoding: 'utf8' }
  );
  const parsedD1 = JSON.parse(d1Output);
  const token = parsedD1[0]?.results[0]?.token;
  if (!token) throw new Error('Failed to find token in remote D1: ' + d1Output);
  console.log('Retrieved decision token:', token);

  // Step 4: Call decision approve URL
  console.log('\n--- Step 4: Call Decision Approve URL ---');
  const approveUrl = `${LIVE_URL}/api/checker/decision?token=${encodeURIComponent(token)}&action=approve`;
  const approveRes = await fetch(approveUrl);
  const approveHtml = await approveRes.text();
  console.log('Approve response status:', approveRes.status);
  if (!approveRes.ok || !approveHtml.includes('Pass Checker Credentials Generated') && !approveHtml.includes('ACCESS ACCEPTED')) {
    throw new Error('Decision approve endpoint failed: ' + approveHtml.slice(0, 300));
  }
  console.log('Verified: Decision approve URL executed successfully.');

  // Step 5: Verify status is now 'approved' with generated password
  console.log('\n--- Step 5: Verify Status is Approved with Password ---');
  const statusApprovedRes = await fetch(`${LIVE_URL}/api/checker/status?email=${encodeURIComponent(testEmail)}`);
  const statusApprovedData = await statusApprovedRes.json();
  console.log('Status code:', statusApprovedRes.status);
  console.log('Response body:', statusApprovedData);
  if (statusApprovedData.status !== 'approved' || !statusApprovedData.password) {
    throw new Error('Expected status approved with password, got: ' + JSON.stringify(statusApprovedData));
  }
  const generatedPassword = statusApprovedData.password;
  console.log('Generated Password:', generatedPassword);

  // Step 6: Verify login accepts the generated password
  console.log('\n--- Step 6: Verify Login with Generated Password ---');
  const loginRes = await fetch(`${LIVE_URL}/api/checker/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: generatedPassword
    })
  });
  const loginData = await loginRes.json();
  console.log('Login status code:', loginRes.status);
  console.log('Login response body:', loginData);
  if (!loginRes.ok || !loginData.ok || !loginData.token) {
    throw new Error('Login with generated password failed: ' + JSON.stringify(loginData));
  }
  console.log('Verified: Login accepted generated password!');

  // Step 7: Verify Master Admin login (jeevanko83@gmail.com + F2026)
  console.log('\n--- Step 7: Verify Admin Login (jeevanko83@gmail.com + F2026) ---');
  const adminLoginRes = await fetch(`${LIVE_URL}/api/checker/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'jeevanko83@gmail.com',
      password: 'F2026'
    })
  });
  const adminLoginData = await adminLoginRes.json();
  console.log('Admin login status code:', adminLoginRes.status);
  console.log('Admin login response body:', adminLoginData);
  if (!adminLoginRes.ok || !adminLoginData.ok || !adminLoginData.token || adminLoginData.role !== 'Lead Administrator') {
    throw new Error('Master admin login failed: ' + JSON.stringify(adminLoginData));
  }
  console.log('Verified: jeevanko83@gmail.com + F2026 logged in instantly!');

  // Clean up test account from remote D1
  console.log('\n--- Cleanup: Remove Test Account from Remote D1 ---');
  execSync(
    `npx wrangler d1 execute DB --remote --command "DELETE FROM checker_accounts WHERE email='${testEmail}'; DELETE FROM checker_auth_logs WHERE email='${testEmail}';"`,
    { stdio: 'ignore' }
  );
  console.log('Cleanup completed.');

  console.log('\n=== ALL LIVE INTEGRATION TESTS PASSED 100% ===');
}

run().catch((err) => {
  console.error('\n❌ LIVE INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
