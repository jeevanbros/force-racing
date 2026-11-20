/**
 * Force Racing Pit Wall Portal API Backend
 * 
 * Hierarchy:
 * Strictly Captain, Vice Captain, Manager, Subsystem Leads, Members.
 * (Zero Administrator policy).
 */

import { json } from './core.js';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, *',
  'Access-Control-Max-Age': '86400'
};

const VALID_ROLES = [
  'captain',
  'vice captain',
  'team manager',
  'manager',
  'subsystem lead',
  'chassis head',
  'chassis head 1',
  'chassis head 2',
  'powertrain lead',
  'aerodynamics lead',
  'suspension & braking lead',
  'electronics lead',
  'member',
  'junior member',
  'fabrication member'
];

function isDisallowedAdmin(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim().toLowerCase();
  return s === 'admin' || s === 'administrator' || s.startsWith('admin_') || s === 'superadmin';
}

// In-Memory active caches
const inMemoryNotifications = [];

const inMemoryTasks = [];

const inMemoryMessages = [];

// Helper: safe JSON parsing
async function parseBody(request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

// D1 Persistence with graceful fallback
async function persistNotificationD1(env, notif) {
  if (env?.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS portal_notifications (
          id TEXT PRIMARY KEY,
          text TEXT,
          type TEXT,
          user_id TEXT,
          to_id TEXT,
          from_id TEXT,
          from_name TEXT,
          task_id TEXT,
          timestamp INTEGER,
          created_at TEXT
        )
      `).run().catch(() => {});
      await env.DB.prepare(`
        INSERT INTO portal_notifications (id, text, type, user_id, to_id, from_id, from_name, task_id, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        String(notif.id),
        notif.text,
        notif.type || 'general',
        notif.userId || null,
        notif.toId || null,
        notif.fromId || null,
        notif.fromName || null,
        String(notif.taskId || ''),
        notif.timestamp,
        notif.createdAt
      ).run().catch(() => {});
    } catch (e) {}
  }
}

async function persistMessageD1(env, msg) {
  if (env?.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS portal_messages (
          id TEXT PRIMARY KEY,
          from_id TEXT,
          to_id TEXT,
          text TEXT,
          file TEXT,
          from_name TEXT,
          to_name TEXT,
          timestamp INTEGER,
          created_at TEXT
        )
      `).run().catch(() => {});
      await env.DB.prepare(`
        INSERT INTO portal_messages (id, from_id, to_id, text, file, from_name, to_name, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        String(msg.id),
        msg.from,
        msg.to,
        msg.text || '',
        msg.file || null,
        msg.fromName || '',
        msg.toName || '',
        msg.timestamp,
        msg.createdAt
      ).run().catch(() => {});
    } catch (e) {}
  }
}

async function persistTaskD1(env, task) {
  if (env?.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS portal_tasks (
          id TEXT PRIMARY KEY,
          subsystem TEXT,
          priority TEXT,
          title TEXT,
          desc TEXT,
          assigned_by TEXT,
          assigned_by_id TEXT,
          assignee_id TEXT,
          assignee_name TEXT,
          uploaded_file TEXT,
          deliverable_notes TEXT,
          status TEXT,
          created_at INTEGER
        )
      `).run().catch(() => {});
      await env.DB.prepare(`
        INSERT OR REPLACE INTO portal_tasks (id, subsystem, priority, title, desc, assigned_by, assigned_by_id, assignee_id, assignee_name, uploaded_file, deliverable_notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        String(task.id),
        task.subsystem || '',
        task.priority || 'Normal',
        task.title || '',
        task.desc || '',
        task.assignedBy || '',
        task.assignedById || '',
        task.assigneeId || '',
        task.assigneeName || '',
        task.uploadedFile || null,
        task.deliverableNotes || '',
        task.status || 'pending',
        task.createdAt || Date.now()
      ).run().catch(() => {});
    } catch (e) {}
  }
}

/**
 * Handle /api/portal/* requests
 */
export async function handlePortalApi(request, env, ctx) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // 1. /api/portal/notifications
  if (path === '/api/portal/notifications' || path === '/api/portal/notifications/') {
    if (request.method === 'GET') {
      const userId = (url.searchParams.get('userId') || url.searchParams.get('to') || '').trim().toLowerCase();
      let notifs = [...inMemoryNotifications];

      if (userId) {
        notifs = notifs.filter(n => {
          if (!n.userId && !n.toId) return true; // broadcast
          if (n.userId && n.userId.toLowerCase() === 'all') return true;
          if (n.userId && n.userId.toLowerCase() === userId) return true;
          if (n.toId && n.toId.toLowerCase() === userId) return true;
          return false;
        });
      }

      notifs.sort((a, b) => b.timestamp - a.timestamp);
      return json({ ok: true, count: notifs.length, notifications: notifs }, 200, CORS_HEADERS);
    }

    if (request.method === 'POST') {
      const body = await parseBody(request);
      const text = (body.text || body.message || body.title || '').trim();
      if (!text) {
        return json({ ok: false, error: 'Notification text is required.' }, 400, CORS_HEADERS);
      }

      const notif = {
        id: body.id || Date.now(),
        text: text,
        type: body.type || 'general',
        userId: body.userId || body.toId || null,
        toId: body.toId || body.userId || null,
        fromId: body.fromId || null,
        fromName: body.fromName || null,
        taskId: body.taskId || null,
        timestamp: body.timestamp || Date.now(),
        createdAt: new Date().toISOString()
      };

      inMemoryNotifications.unshift(notif);
      await persistNotificationD1(env, notif);

      return json({ ok: true, notification: notif }, 201, CORS_HEADERS);
    }

    return json({ ok: false, error: 'Method not allowed.' }, 405, CORS_HEADERS);
  }

  // 2. /api/portal/chat
  if (path === '/api/portal/chat' || path === '/api/portal/chat/') {
    if (request.method === 'GET') {
      const from = (url.searchParams.get('from') || url.searchParams.get('user1') || '').trim().toLowerCase();
      const to = (url.searchParams.get('to') || url.searchParams.get('user2') || '').trim().toLowerCase();

      let msgs = inMemoryMessages;
      if (from && to) {
        msgs = msgs.filter(m => 
          (m.from.toLowerCase() === from && m.to.toLowerCase() === to) ||
          (m.from.toLowerCase() === to && m.to.toLowerCase() === from)
        );
      } else if (from) {
        msgs = msgs.filter(m => m.from.toLowerCase() === from || m.to.toLowerCase() === from);
      }

      msgs = [...msgs].sort((a, b) => a.timestamp - b.timestamp);
      return json({ ok: true, count: msgs.length, messages: msgs }, 200, CORS_HEADERS);
    }

    if (request.method === 'POST') {
      const body = await parseBody(request);
      const from = (body.from || body.fromId || '').trim();
      const to = (body.to || body.toId || '').trim();
      const text = (body.text || body.message || '').trim();
      const file = body.file || null;

      if (!from || !to) {
        return json({ ok: false, error: 'Both from and to user IDs are required.' }, 400, CORS_HEADERS);
      }
      if (!text && !file) {
        return json({ ok: false, error: 'Message text or file attachment is required.' }, 400, CORS_HEADERS);
      }

      const msg = {
        id: body.id || Date.now(),
        from: from,
        to: to,
        text: text,
        file: file,
        fromName: body.fromName || from,
        toName: body.toName || to,
        timestamp: body.timestamp || Date.now(),
        createdAt: new Date().toISOString()
      };

      inMemoryMessages.push(msg);
      await persistMessageD1(env, msg);

      // Automatically create in-app notification for the recipient!
      const notifText = `💬 Message from ${msg.fromName}: "${msg.text || (msg.file ? 'Attached file: ' + msg.file : '')}"`;
      const notif = {
        id: Date.now() + 1,
        text: notifText,
        type: 'chat',
        userId: to,
        toId: to,
        fromId: from,
        fromName: msg.fromName,
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      };
      inMemoryNotifications.unshift(notif);
      await persistNotificationD1(env, notif);

      return json({ ok: true, message: msg, notification: notif }, 201, CORS_HEADERS);
    }

    return json({ ok: false, error: 'Method not allowed.' }, 405, CORS_HEADERS);
  }

  // 3. /api/portal/tasks
  if (path === '/api/portal/tasks' || path === '/api/portal/tasks/') {
    if (request.method === 'GET') {
      const subsystem = (url.searchParams.get('subsystem') || '').trim().toLowerCase();
      const assigneeId = (url.searchParams.get('assigneeId') || url.searchParams.get('assignee') || '').trim().toLowerCase();
      const status = (url.searchParams.get('status') || '').trim().toLowerCase();
      const priority = (url.searchParams.get('priority') || '').trim().toLowerCase();

      let taskList = [...inMemoryTasks];
      if (subsystem) taskList = taskList.filter(t => t.subsystem.toLowerCase() === subsystem);
      if (assigneeId) taskList = taskList.filter(t => t.assigneeId.toLowerCase() === assigneeId);
      if (status) taskList = taskList.filter(t => t.status.toLowerCase() === status);
      if (priority) taskList = taskList.filter(t => t.priority.toLowerCase() === priority);

      return json({ ok: true, count: taskList.length, tasks: taskList }, 200, CORS_HEADERS);
    }

    if (request.method === 'POST') {
      const body = await parseBody(request);

      // Strict Zero Administrator Enforcement
      if (
        isDisallowedAdmin(body.role) ||
        isDisallowedAdmin(body.authority) ||
        isDisallowedAdmin(body.assignedBy) ||
        isDisallowedAdmin(body.approvedBy)
      ) {
        return json({
          ok: false,
          error: 'Administrator role is invalid. Force Racing hierarchy strictly consists of Captain, Vice Captain, Manager, Subsystem Leads, and Members.'
        }, 403, CORS_HEADERS);
      }

      const action = (body.action || '').trim().toLowerCase();
      const taskId = body.id || body.taskId;

      // Handle Task Status Transitions or Creation
      if (action === 'submit_proof' || action === 'submit') {
        const task = inMemoryTasks.find(t => String(t.id) === String(taskId));
        if (!task) return json({ ok: false, error: 'Task not found.' }, 404, CORS_HEADERS);

        task.uploadedFile = body.uploadedFile || task.uploadedFile || 'Proof_Document.pdf';
        task.deliverableNotes = body.deliverableNotes || task.deliverableNotes || '';
        task.status = 'under_review';
        await persistTaskD1(env, task);

        const notif = {
          id: Date.now(),
          text: `🔍 Deliverable submitted: ${body.userName || body.assigneeName || 'Member'} uploaded proof for "${task.title}". Notified ${task.subsystem} Lead for verification.`,
          type: 'deliverable_submitted',
          userId: task.subsystem.toLowerCase() + '_lead',
          taskId: task.id,
          timestamp: Date.now(),
          createdAt: new Date().toISOString()
        };
        inMemoryNotifications.unshift(notif);
        await persistNotificationD1(env, notif);

        return json({ ok: true, task, notification: notif }, 200, CORS_HEADERS);
      }

      if (action === 'lead_verify' || action === 'verify') {
        const task = inMemoryTasks.find(t => String(t.id) === String(taskId));
        if (!task) return json({ ok: false, error: 'Task not found.' }, 404, CORS_HEADERS);

        let approverName = 'Captain';
        let approverId = 'captain';
        if (task.assignedById === 'vicecaptain' || (task.assignedBy && task.assignedBy.includes('Vice Captain'))) {
          approverName = 'Vice Captain';
          approverId = 'vicecaptain';
        } else if (task.assignedById === 'manager' || (task.assignedBy && task.assignedBy.includes('Manager'))) {
          approverName = 'Team Manager';
          approverId = 'manager';
        }

        task.status = 'awaiting_approval';
        task.verifiedBy = body.userName || 'Subsystem Lead';
        await persistTaskD1(env, task);

        const notif = {
          id: Date.now(),
          text: `🔍 Lead Verified: ${body.userName || 'Lead'} verified deliverable for "${task.title}". Now awaiting ${approverName} approval.`,
          type: 'lead_verified',
          userId: approverId,
          taskId: task.id,
          timestamp: Date.now(),
          createdAt: new Date().toISOString()
        };
        inMemoryNotifications.unshift(notif);
        await persistNotificationD1(env, notif);

        return json({ ok: true, task, notification: notif }, 200, CORS_HEADERS);
      }

      if (action === 'approve' || action === 'final_approve' || action === 'superior_approve') {
        const task = inMemoryTasks.find(t => String(t.id) === String(taskId));
        if (!task) return json({ ok: false, error: 'Task not found.' }, 404, CORS_HEADERS);

        task.status = 'done';
        task.approvedBy = body.role || body.userName || 'Captain';
        await persistTaskD1(env, task);

        const notif = {
          id: Date.now(),
          text: `✓ Task Approved & Closed: ${body.userName || 'Captain'} (${task.approvedBy}) approved "${task.title}" with verified deliverable "${task.uploadedFile || 'Proof'}".`,
          type: 'task_approved',
          userId: task.assigneeId,
          taskId: task.id,
          timestamp: Date.now(),
          createdAt: new Date().toISOString()
        };
        inMemoryNotifications.unshift(notif);
        await persistNotificationD1(env, notif);

        return json({ ok: true, task, notification: notif }, 200, CORS_HEADERS);
      }

      // If task ID provided and exists, update general properties
      if (taskId && !action) {
        const task = inMemoryTasks.find(t => String(t.id) === String(taskId));
        if (task) {
          if (body.title) task.title = body.title;
          if (body.desc) task.desc = body.desc;
          if (body.priority) task.priority = body.priority;
          if (body.status) task.status = body.status;
          if (body.uploadedFile !== undefined) task.uploadedFile = body.uploadedFile;
          if (body.deliverableNotes !== undefined) task.deliverableNotes = body.deliverableNotes;
          await persistTaskD1(env, task);
          return json({ ok: true, task }, 200, CORS_HEADERS);
        }
      }

      // Otherwise: Create a new Task
      const title = (body.title || '').trim();
      if (!title) {
        return json({ ok: false, error: 'Task title is required.' }, 400, CORS_HEADERS);
      }

      const newTask = {
        id: taskId || Date.now(),
        subsystem: body.subsystem || 'Chassis',
        priority: body.priority || 'Normal',
        title: title,
        desc: body.desc || '',
        assignedBy: body.assignedBy || 'Captain Dhanush (Captain)',
        assignedById: body.assignedById || 'captain',
        assigneeId: body.assigneeId || 'member_karthik',
        assigneeName: body.assigneeName || 'Karthik P. (Junior Member)',
        uploadedFile: body.uploadedFile || null,
        deliverableNotes: body.deliverableNotes || '',
        status: body.status || 'pending',
        createdAt: body.createdAt || Date.now()
      };

      inMemoryTasks.unshift(newTask);
      await persistTaskD1(env, newTask);

      const notif = {
        id: Date.now(),
        text: `New Task dispatched: "${newTask.title}" assigned to ${newTask.assigneeName}.`,
        type: 'task_assigned',
        userId: newTask.assigneeId,
        toId: newTask.assigneeId,
        taskId: newTask.id,
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      };
      inMemoryNotifications.unshift(notif);
      await persistNotificationD1(env, notif);

      return json({ ok: true, task: newTask, notification: notif }, 201, CORS_HEADERS);
    }

    return json({ ok: false, error: 'Method not allowed.' }, 405, CORS_HEADERS);
  }

  return json({ ok: false, error: 'Portal API endpoint not found.' }, 404, CORS_HEADERS);
}
