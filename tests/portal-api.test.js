import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const mockEnv = {
  DB: null,
  ASSETS: { fetch: async () => new Response('Asset not found', { status: 404 }) }
};
const mockCtx = { waitUntil: () => {} };

async function callApi(urlStr, options = {}) {
  const req = new Request(urlStr, options);
  const res = await worker.fetch(req, mockEnv, mockCtx);
  const data = await res.json().catch(() => null);
  return { res, data };
}

test('Portal API - OPTIONS returns 204 with CORS', async () => {
  const { res } = await callApi('http://localhost:8787/api/portal/notifications', { method: 'OPTIONS' });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
});

test('Portal API - GET /api/portal/notifications (clean 0 slate)', async () => {
  const { res, data } = await callApi('http://localhost:8787/api/portal/notifications');
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  assert.ok(Array.isArray(data.notifications));
  // Clean initial registered slate: 0 initial dummy notifications
  assert.equal(data.notifications.length, 0);
});

test('Portal API - POST /api/portal/notifications', async () => {
  const { res, data } = await callApi('http://localhost:8787/api/portal/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Suspension Lead Srikanth verified camber angles.',
      type: 'lead_verified',
      userId: 'captain',
      fromId: 'suspension_lead'
    })
  });

  assert.equal(res.status, 201);
  assert.equal(data.ok, true);
  assert.equal(data.notification.text, 'Suspension Lead Srikanth verified camber angles.');

  // Verify it appears in newest first
  const { data: list } = await callApi('http://localhost:8787/api/portal/notifications');
  assert.equal(list.notifications[0].text, 'Suspension Lead Srikanth verified camber angles.');
});

test('Portal API - POST & GET /api/portal/chat (chat isolated from task alerts)', async () => {
  // Post chat message from Captain to Vice Captain
  const { res, data } = await callApi('http://localhost:8787/api/portal/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'captain',
      to: 'vicecaptain',
      fromName: 'Dhanush',
      text: 'Have you verified the roll hoop jig clearances?'
    })
  });

  assert.equal(res.status, 201);
  assert.equal(data.ok, true);
  assert.equal(data.message.text, 'Have you verified the roll hoop jig clearances?');

  // Verify chat does NOT pollute task alerts/notifications
  const { data: notifList } = await callApi('http://localhost:8787/api/portal/notifications');
  assert.ok(!notifList.notifications.some(n => n.text && n.text.includes('Have you verified the roll hoop jig clearances')));

  // Get chat messages between captain and vicecaptain
  const { data: chatData } = await callApi('http://localhost:8787/api/portal/chat?from=captain&to=vicecaptain');
  assert.equal(chatData.ok, true);
  assert.ok(chatData.messages.length >= 1);
  assert.equal(chatData.messages[chatData.messages.length - 1].text, 'Have you verified the roll hoop jig clearances?');
});

test('Portal API - POST /api/portal/register verifies duplicate accounts and rejects double registration', async () => {
  // First registration: unique account
  const reg1 = await callApi('http://localhost:8787/api/portal/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Raju TestMember',
      email: 'raju.chassis@forceracing.in',
      phone: '+91 98765 99999',
      subsystem: 'Chassis',
      role: 'Team Member',
      branch: 'Mechanical',
      year: '3rd Year',
      uniqueCode: 'FR26-CHS-99'
    })
  });
  assert.equal(reg1.res.status, 201);
  assert.equal(reg1.data.ok, true);
  assert.equal(reg1.data.member.email, 'raju.chassis@forceracing.in');

  // Second registration with SAME EMAIL (Double account attempt): MUST REJECT with 409 Conflict
  const dupEmail = await callApi('http://localhost:8787/api/portal/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Raju Duplicate',
      email: 'raju.chassis@forceracing.in',
      phone: '+91 98765 88888',
      subsystem: 'Chassis',
      role: 'Team Member'
    })
  });
  assert.equal(dupEmail.res.status, 409);
  assert.equal(dupEmail.data.ok, false);
  assert.equal(dupEmail.data.duplicate, true);
  assert.equal(dupEmail.data.field, 'email');

  // Second registration with SAME PHONE (Double account attempt): MUST REJECT with 409 Conflict
  const dupPhone = await callApi('http://localhost:8787/api/portal/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another Name',
      email: 'another.unique@forceracing.in',
      phone: '+91 98765 99999',
      subsystem: 'Chassis',
      role: 'Team Member'
    })
  });
  assert.equal(dupPhone.res.status, 409);
  assert.equal(dupPhone.data.ok, false);
  assert.equal(dupPhone.data.duplicate, true);
  assert.equal(dupPhone.data.field, 'phone');
});

test('Portal API - GET /api/portal/tasks (clean 0 slate)', async () => {
  const { res, data } = await callApi('http://localhost:8787/api/portal/tasks');
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  assert.ok(Array.isArray(data.tasks));
  // Clean initial registered slate: 0 initial dummy tasks
  assert.equal(data.tasks.length, 0);
});

test('Portal API - POST /api/portal/tasks (Create -> Submit Proof -> Lead Verify -> Approve)', async () => {
  // Step 1: Create Task
  const newTaskId = 99901;
  const { res: createRes, data: createData } = await callApi('http://localhost:8787/api/portal/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: newTaskId,
      title: 'Steering Column Bracket TIG Weld Inspection',
      desc: 'Weld according to 4130 specification and run dye penetrant test.',
      subsystem: 'Chassis',
      priority: 'Priority',
      assignedBy: 'Capt. Dhanush (Captain)',
      assignedById: 'captain',
      assigneeId: 'member_karthik',
      assigneeName: 'Karthik P. (Junior Member)'
    })
  });

  assert.equal(createRes.status, 201);
  assert.equal(createData.ok, true);
  assert.equal(createData.task.status, 'pending');
  assert.ok(createData.notification);

  // Step 2: Submit Proof
  const { res: submitRes, data: submitData } = await callApi('http://localhost:8787/api/portal/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submit_proof',
      id: newTaskId,
      userName: 'Karthik P.',
      uploadedFile: 'Steering_Bracket_Dye_Penetrant_Test.jpg',
      deliverableNotes: 'Passed dye penetrant testing with zero porosity.'
    })
  });

  assert.equal(submitRes.status, 200);
  assert.equal(submitData.ok, true);
  assert.equal(submitData.task.status, 'under_review');
  assert.equal(submitData.task.uploadedFile, 'Steering_Bracket_Dye_Penetrant_Test.jpg');

  // Step 3: Lead Verify
  const { res: verifyRes, data: verifyData } = await callApi('http://localhost:8787/api/portal/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'lead_verify',
      id: newTaskId,
      userName: 'Vikram Sharma (Chassis Head 1)'
    })
  });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyData.ok, true);
  assert.equal(verifyData.task.status, 'awaiting_approval');
  assert.equal(verifyData.task.verifiedBy, 'Vikram Sharma (Chassis Head 1)');

  // Step 4: Final Approve
  const { res: approveRes, data: approveData } = await callApi('http://localhost:8787/api/portal/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approve',
      id: newTaskId,
      userName: 'Dhanush V.',
      role: 'Captain'
    })
  });

  assert.equal(approveRes.status, 200);
  assert.equal(approveData.ok, true);
  assert.equal(approveData.task.status, 'done');
  assert.equal(approveData.task.approvedBy, 'Captain');
});

test('Portal API - Zero Admin Policy Enforcement', async () => {
  const { res, data } = await callApi('http://localhost:8787/api/portal/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Invalid Admin Task',
      role: 'Administrator'
    })
  });

  assert.equal(res.status, 403);
  assert.equal(data.ok, false);
  assert.match(data.error, /Administrator role is invalid/);
});
