/**
 * Sumshodhini '26 Gatekeeper Pass Checker Console
 * Force Racing - KITS Warangal
 */
(function() {
  'use strict';

  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyD9CNFpiQo41pQn1KARMFg1G03iMlkfumR6hFYWBZpCDDAahlCFej90HHjMrojlwtw/exec";
  
  // Safe Storage with memory fallback (handles incognito, cookies blocked, quota limits)
  const memoryStore = {};
  const safeStorage = {
    getItem: function(key) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      } catch(e) {}
      return memoryStore[key] || null;
    },
    setItem: function(key, val) {
      try {
        localStorage.setItem(key, val);
      } catch(e) {}
      memoryStore[key] = String(val);
    },
    removeItem: function(key) {
      try {
        localStorage.removeItem(key);
      } catch(e) {}
      delete memoryStore[key];
    }
  };

  let currentPass = '';

  // Extract Pass ID from QR code raw string or URL
  function extractPassId(raw) {
    if (!raw) return '';
    const text = String(raw).trim();

    // 1. Check if string is a URL containing ?pass= or &pass=
    try {
      if (text.startsWith('http://') || text.startsWith('https://')) {
        const url = new URL(text);
        const p = url.searchParams.get('pass');
        if (p) return p.trim().toUpperCase();
      }
    } catch(e) {}

    // 2. Query param regex match on partial URL or path
    const paramMatch = text.match(/[?&]pass=([^&]+)/i);
    if (paramMatch) {
      return decodeURIComponent(paramMatch[1]).trim().toUpperCase();
    }

    // 3. F1 Simulator Pass ID pattern (e.g. FR26-SIM-83733F88 or FR26-SIM-12345)
    const simMatch = text.match(/\b(FR26-SIM-[A-Z0-9]+)\b/i);
    if (simMatch) return simMatch[1].toUpperCase();

    // 4. General Force Racing pass format (e.g. FR26-XXXX or FR-XXXX)
    const frMatch = text.match(/\b(FR26-[A-Z0-9-]+)\b/i) || text.match(/\b(FR-[A-Z0-9-]+)\b/i);
    if (frMatch) return frMatch[1].toUpperCase();

    // 5. Clean leading noise and whitespace around dashes
    let clean = text.replace(/^(pass\s*#?|id\s*#?|#)\s*/i, '').replace(/[.,;:!?]+$/, '').trim();
    clean = clean.replace(/\s*-\s*/g, '-');
    return clean.toUpperCase();
  }

  // Play audio chime feedback upon QR detection
  function playBeep(success = true) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch(e) {}
  }

  function init() {
    const authGate = document.getElementById('checker-auth-gate');
    const controlPanel = document.getElementById('checker-control-panel');
    const activeCheckerName = document.getElementById('active-checker-name');
    const logoutBtn = document.getElementById('checker-logout-btn');

    const sliderGlider = document.getElementById('slider-glider');
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRequestBtn = document.getElementById('tab-request-btn');
    const panelLoginView = document.getElementById('panel-login-view');
    const panelRequestView = document.getElementById('panel-request-view');

    const loginForm = document.getElementById('checker-login-form');
    const requestForm = document.getElementById('checker-request-form');
    const loginError = document.getElementById('login-error');
    const reqStatusBox = document.getElementById('req-status-box');
    const reqSubmitBtn = document.getElementById('req-submit-btn');

    const searchInput = document.getElementById('pass-input') || document.getElementById('pass-query');
    const searchBtn = document.getElementById('search-btn');
    const loadingEl = document.getElementById('loading');
    const notFoundEl = document.getElementById('not-found');
    const resultCard = document.getElementById('result-card');

    // QR Code Scanner elements
    const btnCameraScan = document.getElementById('btn-camera-scan');
    const btnCameraScanHero = document.getElementById('btn-camera-scan-hero');
    const btnUploadQr = document.getElementById('btn-upload-qr');
    const btnUploadQrHero = document.getElementById('btn-upload-qr-hero');
    const qrFileInput = document.getElementById('qr-file-input');
    const scannerToast = document.getElementById('scanner-status-toast');
    const linkDirectQrScan = document.getElementById('link-direct-qr-scan');
    const authBarrier = document.getElementById('auth-barrier-card');

    // Lightbox modal elements
    const photoLightbox = document.getElementById('photo-lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    const btnEnlargeScreenshot = document.getElementById('btn-enlarge-screenshot');
    const screenshotFrameBox = document.getElementById('screenshot-frame-box');

    // Live Camera Modal elements
    const qrModal = document.getElementById('qr-camera-modal');
    const qrVideo = document.getElementById('qr-video');
    const qrCanvas = document.getElementById('qr-canvas');
    const qrModalStatus = document.getElementById('qr-modal-status');
    const btnCloseScanner = document.getElementById('btn-close-scanner');
    const btnCancelScan = document.getElementById('btn-cancel-scan');
    const btnFlipCamera = document.getElementById('btn-flip-camera');
    const btnToggleTorch = document.getElementById('btn-toggle-torch');

    const vPass = document.getElementById('v-pass');
    const vName = document.getElementById('v-name');
    const vOrg = document.getElementById('v-org');
    const vPhone = document.getElementById('v-phone');
    const vEmail = document.getElementById('v-email');
    const vPaymentBadge = document.getElementById('v-payment-badge');
    const screenshotView = document.getElementById('screenshot-view');
    const uploadView = document.getElementById('upload-view');
    const screenshotImg = document.getElementById('v-screenshot-img');
    const driveLink = document.getElementById('v-drive-link');
    const browseBtn = document.getElementById('browse-btn');
    const fileInput = document.getElementById('proof-file');
    const uploadStatus = document.getElementById('upload-status');
    const reuploadBtn = document.getElementById('reupload-btn');

    const linkToRequest = document.getElementById('link-to-request');
    const linkToLogin = document.getElementById('link-to-login');

    function setPassFieldValue(val) {
      const el1 = document.getElementById('pass-input');
      const el2 = document.getElementById('pass-query');
      if (el1) el1.value = val;
      if (el2) el2.value = val;
    }

    function formatDriveUrl(url) {
      if (!url || typeof url !== 'string') return url;
      if (url.startsWith('data:image/')) return url;
      const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (matchFile && matchFile[1]) {
        return `https://drive.google.com/thumbnail?id=${matchFile[1]}&sz=w1200`;
      }
      const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) {
        return `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w1200`;
      }
      return url;
    }

    function showScannerStatus(msg, type = 'info', autoHide = 5000) {
      if (!scannerToast) return;
      scannerToast.className = 'scanner-toast ' + type;
      scannerToast.innerHTML = msg;
      scannerToast.style.display = 'block';
      if (autoHide > 0) {
        setTimeout(() => {
          if (scannerToast.innerHTML === msg) scannerToast.style.display = 'none';
        }, autoHide);
      }
    }

    // Tab Switching Function
    function showTab(tab) {
      const isReq = (tab === 'request');
      if (sliderGlider) {
        sliderGlider.style.transform = isReq ? 'translateX(100%)' : 'translateX(0)';
      }
      if (tabRequestBtn) {
        if (isReq) tabRequestBtn.classList.add('active');
        else tabRequestBtn.classList.remove('active');
      }
      if (tabLoginBtn) {
        if (!isReq) tabLoginBtn.classList.add('active');
        else tabLoginBtn.classList.remove('active');
      }
      if (panelLoginView) panelLoginView.style.display = isReq ? 'none' : 'block';
      if (panelRequestView) panelRequestView.style.display = isReq ? 'block' : 'none';
    }
    window.showTab = showTab;

    // Grant Access Helper
    function grantAccess(email, role) {
      const sessionData = {
        email: email || 'Administrator',
        role: role || 'Lead Coordinator',
        timestamp: Date.now()
      };
      safeStorage.setItem('sumshodhini_checker_session', JSON.stringify(sessionData));
      if (loginError) loginError.style.display = 'none';
      checkAuth();
    }

    // Every sign-in — including the administrator master password and ?pin= links —
    // is verified by the Worker. Nothing is granted from the browser alone.
    async function serverLogin(email, password) {
      const res = await fetch('/api/checker/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(email ? { email, password } : { pin: password })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        grantAccess(data.email, data.role || 'Authorized Coordinator');
        return data;
      }
      throw new Error(data.error || 'Access Denied: Your account is awaiting approval before you can sign in.');
    }

    // Links and Tab Listeners
    if (linkToRequest) linkToRequest.addEventListener('click', () => showTab('request'));
    if (linkToLogin) linkToLogin.addEventListener('click', () => showTab('login'));

    if (tabLoginBtn) {
      tabLoginBtn.addEventListener('click', () => showTab('login'));
      tabLoginBtn.addEventListener('touchstart', (e) => { e.preventDefault(); showTab('login'); }, { passive: false });
    }
    if (tabRequestBtn) {
      tabRequestBtn.addEventListener('click', () => showTab('request'));
      tabRequestBtn.addEventListener('touchstart', (e) => { e.preventDefault(); showTab('request'); }, { passive: false });
    }

    // Check Authentication
    function checkAuth() {
      const session = safeStorage.getItem('sumshodhini_checker_session');
      const params = new URLSearchParams(window.location.search);
      const pinParam = (params.get('pin') || '').trim();
      const passParam = (params.get('pass') || '').trim();

      if (pinParam) {
        // Strip the secret from the address bar, then verify it with the Worker.
        try {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('pin');
          window.history.replaceState({}, '', cleanUrl.toString());
        } catch {}
        const passField = document.getElementById('checker-password');
        if (passField) passField.value = pinParam;
        showTab('login');
        serverLogin('', pinParam)
          .catch((err) => {
            if (loginError) {
              loginError.textContent = err.message;
              loginError.style.display = 'block';
            }
          });
      }

      if (session) {
        try {
          const data = JSON.parse(session);
          if (authGate) authGate.style.display = 'none';
          if (authBarrier) authBarrier.style.display = 'none';
          if (controlPanel) controlPanel.style.display = 'block';
          if (activeCheckerName) {
            activeCheckerName.textContent = `${data.email || 'Authorized'} (${data.role || 'Checker'})`;
          }
          if (passParam) {
            setPassFieldValue(passParam);
            lookup(passParam);
          }
          return true;
        } catch(e) {}
      }
      if (authGate) authGate.style.display = 'block';
      if (authBarrier) authBarrier.style.display = 'block';
      if (controlPanel) controlPanel.style.display = 'none';
      return false;
    }

    // Login Form Submit (Strict Backend Database Authentication)
    if (loginForm) {
      loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const emailEl = document.getElementById('checker-email');
        const passEl = document.getElementById('checker-password');
        const email = (emailEl ? emailEl.value : '').trim();
        const password = (passEl ? passEl.value : '').trim();

        if (loginError) {
          loginError.style.display = 'none';
          loginError.textContent = '';
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Verifying credentials...';
        }

        try {
          await serverLogin(email, password);
        } catch (err) {
          if (loginError) {
            loginError.textContent = err.message === 'Failed to fetch'
              ? 'Connection error. Please check your internet connection and retry.'
              : err.message;
            loginError.style.display = 'block';
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In to Pass Checker';
          }
        }
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    let statusPollInterval = null;
    let transientTimer = null;
    let isCheckingStatus = false;
    const POLL_INTERVAL_MS = 1500; // Poll every 1.5 seconds (1500ms) while awaiting approval (optimized from 2500)

    function stopStatusPolling() {
      if (statusPollInterval) {
        clearInterval(statusPollInterval);
        statusPollInterval = null;
      }
    }

    function stopTransientTimer() {
      if (transientTimer) {
        clearInterval(transientTimer);
        transientTimer = null;
      }
    }

    window.addEventListener('beforeunload', () => {
      stopStatusPolling();
      stopTransientTimer();
    });

    async function triggerImmediateCheck(overrideEmail) {
      const targetEmail = (overrideEmail || safeStorage.getItem('pending_checker_email') || '').trim();
      if (!targetEmail) return;
      if (isCheckingStatus) return;
      isCheckingStatus = true;

      try {
        const pollRes = await fetch(`/api/checker/status?email=${encodeURIComponent(targetEmail)}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (!pollRes.ok) return;
        const pollData = await pollRes.json();
        if (pollData && pollData.ok) {
          if (pollData.status === 'approved') {
            stopStatusPolling();
            reflectApprovedAccess(pollData, targetEmail);
          } else if (pollData.status === 'rejected') {
            stopStatusPolling();
            reflectRejectedAccess(targetEmail);
          }
        }
      } catch (pollErr) {
        // Ignore background network errors
      } finally {
        isCheckingStatus = false;
      }
    }

    function startStatusPolling(targetEmail) {
      stopStatusPolling();
      stopTransientTimer();
      const email = (targetEmail || safeStorage.getItem('pending_checker_email') || '').trim();
      if (!email) return;

      triggerImmediateCheck(email);

      statusPollInterval = setInterval(() => {
        triggerImmediateCheck(email);
      }, POLL_INTERVAL_MS);
    }

    // Event listeners for instant wakeup (handles mobile app switching, background tab throttling)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerImmediateCheck();
      }
    });

    window.addEventListener('focus', () => {
      triggerImmediateCheck();
    });

    function renderPendingRequestUI(email) {
      if (!reqStatusBox) return;
      reqStatusBox.className = 'req-status-confirmed';
      reqStatusBox.style.display = 'block';
      reqStatusBox.style.background = 'color-mix(in srgb, var(--gp-ok) 15%, transparent)';
      reqStatusBox.style.border = '1px solid var(--gp-ok)';
      reqStatusBox.style.color = 'var(--gp-ok)';
      reqStatusBox.innerHTML = `
        <!-- Access request submitted. -->
        <div class="req-status-title" style="font-size:1rem;font-weight:700;color:var(--gp-ok);margin-bottom:6px;">
          ✅ Access Request Submitted
        </div>
        <p class="req-status-desc" style="margin:6px 0 10px;font-size:0.875rem;color:var(--gp-ink-2);line-height:1.4;">
          Awaiting approval. You will receive your login password at your email (${escapeHtml(email)}) once approved.
        </p>
        <div class="live-indicator" style="display:inline-flex;align-items:center;gap:8px;background:color-mix(in srgb, var(--gp-accent) 12%, transparent);border:1px solid var(--gp-accent);color:var(--gp-accent);padding:6px 12px;border-radius:4px;font-size:0.813rem;font-weight:600;">
          <span class="live-dot" style="width:8px;height:8px;border-radius:50%;background:var(--gp-accent);display:inline-block;box-shadow:0 0 8px color-mix(in srgb, var(--gp-accent) 60%, transparent);"></span>
          Waiting for approval...
        </div>
        <div style="margin-top:14px;">
          <button type="button" class="btn secondary" id="btn-back-to-login" style="min-height:36px;padding:4px 16px;font-size:0.813rem;">
            ← Return to Sign In
          </button>
        </div>
      `;
      const btnBack = document.getElementById('btn-back-to-login');
      if (btnBack) btnBack.addEventListener('click', () => showTab('login'));
    }

    function reflectApprovedAccess(account, targetEmail) {
      if (!reqStatusBox) return;

      stopStatusPolling();
      stopTransientTimer();
      safeStorage.removeItem('pending_checker_email');
      safeStorage.removeItem('pending_checker_time');

      // Ensure view is on the request panel so user sees the approved reflection
      showTab('request');

      const approvedPassword = account.password || '';
      let secondsLeft = 8;

      reqStatusBox.style.display = 'block';
      reqStatusBox.style.background = 'color-mix(in srgb, var(--gp-ok) 15%, transparent)';
      reqStatusBox.style.border = '2px solid var(--gp-ok)';
      reqStatusBox.style.boxShadow = '0 0 24px color-mix(in srgb, var(--gp-ok) 35%, transparent)';

      reqStatusBox.innerHTML = `
        <div class="approved-reflection-box" style="padding:16px 12px;text-align:center;">
          <div style="font-size:1.2rem;font-weight:900;color:var(--gp-ok);letter-spacing:0.5px;margin-bottom:12px;">
            ✅ PASSCHECKER ACCESS APPROVED!
          </div>
          <!-- Deliberately dark in both themes: this fixed-background panel is a
               device-style readout of the one-time password, like a terminal screen. -->
          <div style="background:#06080e;border:1.5px dashed var(--gp-on-dark-3);border-radius:8px;padding:14px;margin:12px auto;max-width:320px;">
            <span style="display:block;font-size:0.75rem;color:var(--gp-on-dark-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Assigned Password:</span>
            <span style="font-family:monospace;font-size:2rem;font-weight:900;color:var(--gp-on-dark);letter-spacing:3px;">${escapeHtml(approvedPassword)}</span>
          </div>
          <p id="countdown-text" style="font-size:0.875rem;color:var(--gp-ink-2);margin:14px 0 16px;line-height:1.4;">
            Automatically entering console in <strong id="countdown-num" style="color:var(--gp-accent);font-size:1.1rem;">8</strong> seconds... (Also emailed to ${escapeHtml(targetEmail)})
          </p>
          <button type="button" class="btn" id="btn-enter-console-now" style="width:100%;justify-content:center;font-weight:800;background:var(--gp-accent);color:var(--gp-accent-ink);box-shadow:0 0 16px color-mix(in srgb, var(--gp-accent) 40%, transparent);">
            [ Enter Console Now ]
          </button>
        </div>
      `;

      playBeep(true);

      function enterConsole() {
        stopTransientTimer();
        // Clear on-screen reflection so sensitive password doesn't linger ("delete automatically")
        if (reqStatusBox) {
          reqStatusBox.innerHTML = '';
          reqStatusBox.style.display = 'none';
        }
        const passEl = document.getElementById('checker-password');
        if (passEl) passEl.value = '';
        grantAccess(targetEmail, account.role || account.organization || 'Authorized Gate Checker');
      }

      const btnEnter = document.getElementById('btn-enter-console-now');
      if (btnEnter) {
        btnEnter.addEventListener('click', enterConsole);
      }

      transientTimer = setInterval(() => {
        secondsLeft--;
        const numEl = document.getElementById('countdown-num');
        if (numEl) numEl.textContent = String(secondsLeft);
        if (secondsLeft <= 0) {
          enterConsole();
        }
      }, 1000);
    }

    function reflectRejectedAccess(targetEmail) {
      if (!reqStatusBox) return;
      stopStatusPolling();
      stopTransientTimer();
      safeStorage.removeItem('pending_checker_email');
      safeStorage.removeItem('pending_checker_time');
      showTab('request');
      reqStatusBox.style.display = 'block';
      reqStatusBox.style.background = 'color-mix(in srgb, var(--gp-danger) 15%, transparent)';
      reqStatusBox.style.border = '1px solid var(--gp-danger)';
      reqStatusBox.style.color = 'var(--gp-danger)';
      reqStatusBox.innerHTML = `
        <strong>❌ Access Request Rejected</strong>
        <p style="margin:8px 0 0;font-size:0.875rem;color:var(--gp-ink-2);line-height:1.4;">
          Your access request for <strong>${escapeHtml(targetEmail)}</strong> was not approved.
        </p>
        <div style="margin-top:14px;">
          <button type="button" class="btn secondary" id="btn-back-to-login" style="min-height:36px;padding:4px 16px;font-size:0.813rem;">
            ← Return to Sign In
          </button>
        </div>
      `;
      const btnBack = document.getElementById('btn-back-to-login');
      if (btnBack) btnBack.addEventListener('click', () => showTab('login'));
      playBeep(false);
    }

    // Request Access Submit (Submits request to Admin via Telegram + Email with Password Dispatch)
    if (requestForm) {
      requestForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nameEl = document.getElementById('req-name');
        const emailEl = document.getElementById('req-email');
        const phoneEl = document.getElementById('req-phone');
        const roleEl = document.getElementById('req-role');
        const reasonEl = document.getElementById('req-reason');
        const name = (nameEl ? nameEl.value : '').trim();
        const email = (emailEl ? emailEl.value : '').trim();
        const phone = (phoneEl ? phoneEl.value : '').trim();
        const role = (roleEl ? roleEl.value : '').trim();
        const reason = (reasonEl ? reasonEl.value : '').trim();

        if (reqStatusBox) {
          reqStatusBox.style.display = 'block';
          reqStatusBox.className = '';
          reqStatusBox.style.background = 'color-mix(in srgb, var(--gp-accent) 10%, transparent)';
          reqStatusBox.style.border = '1px solid var(--gp-accent)';
          reqStatusBox.style.color = 'var(--gp-accent)';
          reqStatusBox.textContent = 'Submitting access request...';
        }
        if (reqSubmitBtn) {
          reqSubmitBtn.disabled = true;
          reqSubmitBtn.textContent = 'Submitting request...';
        }

        try {
          const res = await fetch('/api/checker/request-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, organization: role, role, reason })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            throw new Error(data.error || 'Failed to submit request. Please check your network and retry.');
          }

          // A repeat request must not look like a fresh pending one: the account is
          // already approved, so send the applicant to the sign-in tab instead.
          if (data.alreadyApproved || data.status === 'approved') {
            stopStatusPolling();
            safeStorage.removeItem('pending_checker_email');
            safeStorage.removeItem('pending_checker_time');
            if (reqStatusBox) {
              reqStatusBox.className = '';
              reqStatusBox.style.display = 'block';
              reqStatusBox.style.background = 'color-mix(in srgb, var(--gp-ok) 15%, transparent)';
              reqStatusBox.style.border = '1px solid var(--gp-ok)';
              reqStatusBox.style.color = 'var(--gp-ok)';
              reqStatusBox.innerHTML = `
                <div class="req-status-title" style="font-size:1rem;font-weight:700;margin-bottom:6px;">✅ Access Already Approved</div>
                <p class="req-status-desc" style="margin:6px 0 12px;font-size:0.875rem;color:var(--gp-ink-2);line-height:1.4;">
                  ${escapeHtml(email)} already has approved access. Sign in with the password from your approval email.
                </p>
                <button type="button" class="btn" id="btn-go-signin" style="min-height:40px;padding:6px 18px;font-size:0.875rem;justify-content:center;">
                  Go to Sign In
                </button>
              `;
              const btnSignIn = document.getElementById('btn-go-signin');
              if (btnSignIn) {
                btnSignIn.addEventListener('click', () => {
                  const emailField = document.getElementById('checker-email');
                  if (emailField) emailField.value = email;
                  showTab('login');
                });
              }
            }
            if (requestForm) requestForm.reset();
            return;
          }

          // Save pending checker email and timestamp (valid for 15 minutes)
          safeStorage.setItem('pending_checker_email', email);
          safeStorage.setItem('pending_checker_time', String(Date.now()));

          renderPendingRequestUI(email);
          if (requestForm) requestForm.reset();

          // Initiate real-time access polling every 1.5 seconds (1500ms)
          startStatusPolling(email);

        } catch (err) {
          if (reqStatusBox) {
            reqStatusBox.className = '';
            reqStatusBox.style.background = 'color-mix(in srgb, var(--gp-danger) 15%, transparent)';
            reqStatusBox.style.border = '1px solid var(--gp-danger)';
            reqStatusBox.style.color = 'var(--gp-danger)';
            reqStatusBox.textContent = err.message || 'Failed to submit request. Please check your network and retry.';
          }
        } finally {
          if (reqSubmitBtn) {
            reqSubmitBtn.disabled = false;
            reqSubmitBtn.textContent = 'Submit Access Request';
          }
        }
      });
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function() {
        const session = safeStorage.getItem('sumshodhini_checker_session');
        let email = '';
        if (session) {
          try { email = JSON.parse(session).email || ''; } catch {}
        }
        try {
          fetch('/api/checker/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
        } catch {}
        safeStorage.removeItem('sumshodhini_checker_session');
        safeStorage.removeItem('pending_checker_email');
        safeStorage.removeItem('pending_checker_time');
        stopStatusPolling();
        stopTransientTimer();
        checkAuth();
        showTab('login');
      });
    }

    // Lookup Pass
    async function lookup(pass) {
      const raw = (pass || '').trim();
      let clean = raw.replace(/^(pass\s*#?|id\s*#?|#)\s*/i, '').replace(/[.,;:!?]+$/, '').trim();
      clean = clean.replace(/\s*-\s*/g, '-');
      currentPass = clean.toUpperCase();
      setPassFieldValue(currentPass);
      if (loadingEl) loadingEl.style.display = 'block';
      if (notFoundEl) notFoundEl.style.display = 'none';
      if (resultCard) resultCard.style.display = 'none';

      try {
        // Attempt 1: Worker API with raw query (matches exact, suffix, email, phone)
        let res = await fetch('/api/verify?pass=' + encodeURIComponent(raw)).catch(() => null);
        let data = null;
        if (res && res.ok) {
          data = await res.json();
        }

        // Attempt 2: If raw didn't work and clean is different, try cleaned string
        if ((!data || data.status === 'not_found' || (!data.ok && data.status !== 'found')) && clean !== raw) {
          res = await fetch('/api/verify?pass=' + encodeURIComponent(clean)).catch(() => null);
          if (res && res.ok) {
            data = await res.json();
          }
        }

        // Attempt 3: Fallback direct to Apps Script
        if (!data || data.status === 'not_found' || (!data.ok && data.status !== 'found')) {
          const scriptRes = await fetch(APPS_SCRIPT_URL + '?action=verify&pass=' + encodeURIComponent(currentPass)).catch(() => null);
          if (scriptRes && scriptRes.ok) {
            data = await scriptRes.json();
          }
        }

        if (loadingEl) loadingEl.style.display = 'none';

        if (data && (data.status === 'found' || data.ok)) {
          const rec = data.record || data;
          const pid = rec.passId || rec.reference || currentPass;
          if (vPass) vPass.textContent = pid;
          if (vName) vName.textContent = rec.name || 'Formula Pilot';
          if (vOrg) vOrg.textContent = rec.organization || rec.rollNumber || rec.college || 'Kakatiya Institute of Technology & Science';
          
          const rawPhone = String(rec.phone || 'N/A').trim();
          const cleanPhone = rawPhone.replace(/\D/g, '');
          const phoneTextEl = document.getElementById('v-phone-text');
          const phoneCallEl = document.getElementById('v-phone-call');
          const phoneWaEl = document.getElementById('v-phone-wa');
          if (phoneTextEl) phoneTextEl.textContent = rawPhone;
          if (phoneCallEl) {
            if (cleanPhone) {
              phoneCallEl.href = 'tel:' + cleanPhone;
              phoneCallEl.style.display = 'inline';
            } else {
              phoneCallEl.style.display = 'none';
            }
          }
          if (phoneWaEl) {
            if (cleanPhone) {
              const waNum = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
              phoneWaEl.href = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent('Hi ' + (rec.name || 'Pilot') + ', Force Racing Race Control here regarding your Sumshodhini pass ' + pid);
              phoneWaEl.style.display = 'inline';
            } else {
              phoneWaEl.style.display = 'none';
            }
          }

          const emailEl = document.getElementById('v-email');
          const emailLinkEl = document.getElementById('v-email-link');
          if (emailEl) emailEl.textContent = rec.email || 'N/A';
          if (emailLinkEl && rec.email) emailLinkEl.href = 'mailto:' + rec.email;

          const slotEl = document.getElementById('v-slot');
          if (slotEl) slotEl.textContent = rec.slot || rec.tier || rec.category || rec.subsystem || 'F1 Sim Racing Challenge (31 Oct 2026)';

          const timeEl = document.getElementById('v-timestamp');
          if (timeEl) {
            let tStr = rec.timestamp || rec.created_at || 'Confirmed';
            if (typeof rec.created_at === 'number') {
              tStr = new Date(rec.created_at * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            }
            timeEl.textContent = tStr;
          }

          // Check-In Status & Toggle
          const credStatusEl = document.getElementById('cred-status');
          const gateStatusEl = document.getElementById('v-gate-status');
          const btnMarkCheckin = document.getElementById('btn-mark-checkin');
          const checkedInMap = JSON.parse(safeStorage.getItem('sumshodhini_checked_in_passes') || '{}');

          const isFlagged = rec.paymentStatus === 'flagged' || rec.status === 'flagged' || rec.status === 'cancelled';
          if (credStatusEl) {
            if (isFlagged) {
              credStatusEl.textContent = 'FLAGGED / CONTACT ADMIN';
              credStatusEl.className = 'status-pill';
              credStatusEl.style.background = 'color-mix(in srgb, var(--gp-danger) 20%, transparent)';
              credStatusEl.style.color = 'var(--gp-danger)';
              credStatusEl.style.border = '1px solid var(--gp-danger)';
            } else {
              credStatusEl.textContent = 'CREDENTIAL CONFIRMED';
              credStatusEl.className = 'status-pill valid';
              credStatusEl.style.background = '';
              credStatusEl.style.color = '';
              credStatusEl.style.border = '';
            }
          }

          function updateGateUI(isChecked) {
            if (gateStatusEl) {
              if (isChecked) {
                gateStatusEl.textContent = '🟢 CHECKED IN TO PIT LANE (VERIFIED)';
                gateStatusEl.style.color = 'var(--gp-ok)';
              } else {
                gateStatusEl.textContent = '🟡 CREDENTIAL VALID · READY FOR CHECK-IN';
                gateStatusEl.style.color = 'var(--gp-accent)';
              }
            }
            if (btnMarkCheckin) {
              btnMarkCheckin.textContent = isChecked ? '↺ Undo Check-In' : '✅ Mark Check-In Complete';
              btnMarkCheckin.style.background = isChecked ? 'var(--gp-bg-sunk)' : 'var(--gp-ok)';
              btnMarkCheckin.style.borderColor = isChecked ? 'color-mix(in srgb, var(--gp-ink) 20%, transparent)' : 'var(--gp-ok)';
              btnMarkCheckin.style.color = isChecked ? 'var(--gp-ink)' : 'var(--gp-bg)';
            }
          }

          const initialChecked = !!checkedInMap[pid];
          updateGateUI(initialChecked);

          if (btnMarkCheckin) {
            btnMarkCheckin.onclick = function() {
              const currentMap = JSON.parse(safeStorage.getItem('sumshodhini_checked_in_passes') || '{}');
              const nowChecked = !currentMap[pid];
              if (nowChecked) currentMap[pid] = Date.now();
              else delete currentMap[pid];
              safeStorage.setItem('sumshodhini_checked_in_passes', JSON.stringify(currentMap));
              updateGateUI(nowChecked);
            };
          }

          const rawProofUrl = rec.driveUrl || rec.screenshotUrl || rec.screenshotBase64 || safeStorage.getItem('proof_' + pid) || safeStorage.getItem('proof_' + currentPass) || safeStorage.getItem('proof_' + (rec.passId || ''));
          const proofUrl = formatDriveUrl(rawProofUrl);

          if (proofUrl) {
            if (screenshotImg) screenshotImg.src = proofUrl;
            if (driveLink) {
              if (proofUrl.startsWith('data:')) {
                driveLink.style.display = 'none';
              } else {
                driveLink.href = proofUrl;
                driveLink.style.display = 'inline-flex';
              }
            }
            if (screenshotView) screenshotView.style.display = 'block';
            if (uploadView) uploadView.style.display = 'none';
            if (vPaymentBadge) {
              const isVerified = (rec.paymentStatus && !/pending/i.test(rec.paymentStatus));
              vPaymentBadge.textContent = isVerified ? rec.paymentStatus.toUpperCase() : 'PAYMENT VERIFIED (₹99)';
              vPaymentBadge.className = 'payment-badge uploaded';
            }
          } else {
            if (screenshotView) screenshotView.style.display = 'none';
            if (uploadView) uploadView.style.display = 'block';
            if (vPaymentBadge) {
              vPaymentBadge.textContent = rec.paymentStatus ? rec.paymentStatus.toUpperCase() : 'PROOF PENDING (₹99)';
              vPaymentBadge.className = 'payment-badge pending';
            }
          }

          if (resultCard) {
            resultCard.style.display = 'block';
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else {
          if (notFoundEl) notFoundEl.style.display = 'block';
        }
      } catch (err) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (notFoundEl) notFoundEl.style.display = 'block';
      }
    }

    // Expose searchPass globally and alias to lookup
    window.searchPass = lookup;

    // Search Buttons
    if (searchBtn) {
      searchBtn.addEventListener('click', function() {
        const val = (searchInput ? searchInput.value : '').trim();
        if (val) lookup(val);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = searchInput.value.trim();
          if (val) lookup(val);
        }
      });
    }

    // -------------------------------------------------------------
    // QR Code Scanning & Photo Upload System
    // -------------------------------------------------------------

    function handleQrCodeFound(decodedText) {
      playBeep(true);
      if (navigator.vibrate) {
        try { navigator.vibrate([60, 40, 60]); } catch(e) {}
      }

      const passId = extractPassId(decodedText);
      if (!passId) {
        showScannerStatus('⚠️ QR Code detected but could not extract Pass ID: ' + decodedText, 'error');
        return;
      }

      // If user was on auth gate and scanned directly, open credential view
      const session = safeStorage.getItem('sumshodhini_checker_session');
      if (!session) {
        if (authGate) authGate.style.display = 'none';
        if (authBarrier) authBarrier.style.display = 'none';
        if (controlPanel) controlPanel.style.display = 'block';
        if (activeCheckerName) {
          activeCheckerName.textContent = 'Participant Credential View (Click Sign In for Checker Mode)';
        }
      }

      setPassFieldValue(passId);
      showScannerStatus(`✅ <strong>QR Pass Scanned:</strong> <code>${passId}</code>. Inspecting credentials...`, 'success', 4000);
      lookup(passId);
    }

    // Decode QR Code from an uploaded Image File using BarcodeDetector or jsQR canvas fallback
    async function decodeImageFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function() {
          const img = new Image();
          img.onload = async function() {
            // Attempt 1: Native BarcodeDetector API if available
            if ('BarcodeDetector' in window) {
              try {
                const detector = new BarcodeDetector({ formats: ['qr_code'] });
                const barcodes = await detector.detect(img);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  return resolve(barcodes[0].rawValue);
                }
              } catch(e) {}
            }

            // Attempt 2: jsQR canvas fallback
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              let w = img.naturalWidth || img.width;
              let h = img.naturalHeight || img.height;
              const maxDim = 1200;
              if (w > maxDim || h > maxDim) {
                if (w > h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }
              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(img, 0, 0, w, h);
              const imgData = ctx.getImageData(0, 0, w, h);
              if (window.jsQR) {
                const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: 'attemptBoth'
                });
                if (code && code.data) {
                  return resolve(code.data);
                }
              }
            } catch(cErr) {
              return reject(cErr);
            }
            resolve(null);
          };
          img.onerror = () => reject(new Error('Could not load image file.'));
          img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsDataURL(file);
      });
    }

    // Photo Upload Handler
    if (btnUploadQr && qrFileInput) {
      btnUploadQr.addEventListener('click', () => qrFileInput.click());
    }
    if (btnUploadQrHero && qrFileInput) {
      btnUploadQrHero.addEventListener('click', () => qrFileInput.click());
    }

    if (qrFileInput) {
      qrFileInput.addEventListener('change', async function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        showScannerStatus('🔍 Analyzing photo for pilot QR code...', 'info', 0);

        try {
          const decoded = await decodeImageFile(file);
          if (decoded) {
            handleQrCodeFound(decoded);
          } else {
            playBeep(false);
            showScannerStatus('⚠️ No valid QR code detected in this photo. Ensure the QR code is clearly visible and well-lit, or enter Pass ID manually.', 'error', 6000);
          }
        } catch(err) {
          playBeep(false);
          showScannerStatus('⚠️ Image decoding error: ' + (err.message || 'Please retry with another photo.'), 'error', 6000);
        } finally {
          qrFileInput.value = '';
        }
      });
    }

    // Live Camera Scanner
    let cameraStream = null;
    let scanRafId = null;
    let currentFacingMode = 'environment';
    let lastScanTime = 0;
    let nativeBarcodeDetector = null;
    if ('BarcodeDetector' in window) {
      try {
        nativeBarcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
      } catch(e) {}
    }

    async function startCameraScanner() {
      if (!qrModal || !qrVideo) return;

      // Fallback automatically to native file / camera input if getUserMedia is unavailable
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showScannerStatus('Direct camera stream not supported. Opening photo/camera capture...', 'info', 3000);
        if (qrFileInput) qrFileInput.click();
        return;
      }

      qrModal.style.display = 'flex';
      if (qrModalStatus) qrModalStatus.textContent = 'Initializing camera...';

      try {
        if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
        }

        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: currentFacingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        } catch (constraintErr) {
          // Fallback to basic { video: true } if ideal constraints fail
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }

        qrVideo.srcObject = cameraStream;
        await qrVideo.play();
        if (qrModalStatus) qrModalStatus.textContent = 'Align QR Code inside the crosshairs';

        const ctx = qrCanvas ? qrCanvas.getContext('2d', { willReadFrequently: true }) : null;
        lastScanTime = 0;

        async function scanFrame(timestamp) {
          if (!cameraStream || qrVideo.readyState < 2 || qrVideo.videoWidth === 0) {
            scanRafId = requestAnimationFrame(scanFrame);
            return;
          }

          // Throttle scanning to every ~100ms for smooth 60fps UI and low battery consumption
          const now = timestamp || performance.now();
          if (now - lastScanTime < 100) {
            scanRafId = requestAnimationFrame(scanFrame);
            return;
          }
          lastScanTime = now;

          let detected = null;

          // 1. Native BarcodeDetector API (fastest, hardware accelerated)
          if (nativeBarcodeDetector) {
            try {
              const barcodes = await nativeBarcodeDetector.detect(qrVideo);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detected = barcodes[0].rawValue;
              }
            } catch(e) {}
          }

          // 2. jsQR canvas fallback
          if (!detected && window.jsQR && qrCanvas && ctx) {
            const vw = qrVideo.videoWidth;
            const vh = qrVideo.videoHeight;
            let dw = vw, dh = vh;
            if (dw > 640 || dh > 640) {
              if (dw > dh) { dh = Math.round((dh * 640) / dw); dw = 640; }
              else { dw = Math.round((dw * 640) / dh); dh = 640; }
            }
            if (qrCanvas.width !== dw || qrCanvas.height !== dh) {
              qrCanvas.width = dw;
              qrCanvas.height = dh;
            }
            ctx.drawImage(qrVideo, 0, 0, dw, dh);
            const imgData = ctx.getImageData(0, 0, dw, dh);
            const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert'
            });
            if (code && code.data) {
              detected = code.data;
            }
          }

          if (detected) {
            stopCameraScanner();
            handleQrCodeFound(detected);
            return;
          }

          scanRafId = requestAnimationFrame(scanFrame);
        }

        scanRafId = requestAnimationFrame(scanFrame);
      } catch(err) {
        console.error('Camera access error:', err);
        stopCameraScanner();
        showScannerStatus('⚠️ Camera access denied or unavailable: ' + (err.message || 'Check camera permissions') + '. Opening photo upload...', 'error', 5000);
        if (qrFileInput) qrFileInput.click();
      }
    }

    function stopCameraScanner() {
      if (scanRafId) {
        cancelAnimationFrame(scanRafId);
        scanRafId = null;
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
      }
      if (qrModal) qrModal.style.display = 'none';
    }

    if (btnCameraScanHero) btnCameraScanHero.addEventListener('click', startCameraScanner);
    if (btnCameraScan) btnCameraScan.addEventListener('click', startCameraScanner);
    if (linkDirectQrScan) linkDirectQrScan.addEventListener('click', startCameraScanner);
    if (btnCloseScanner) btnCloseScanner.addEventListener('click', stopCameraScanner);
    if (btnCancelScan) btnCancelScan.addEventListener('click', stopCameraScanner);

    if (btnFlipCamera) {
      btnFlipCamera.addEventListener('click', function() {
        currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
        startCameraScanner();
      });
    }

    if (btnToggleTorch) {
      btnToggleTorch.addEventListener('click', async function() {
        if (!cameraStream) return;
        const track = cameraStream.getVideoTracks()[0];
        if (!track) return;
        try {
          const capabilities = track.getCapabilities ? track.getCapabilities() : {};
          if (capabilities.torch) {
            const currentSettings = track.getSettings();
            const nextTorch = !currentSettings.torch;
            await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
            btnToggleTorch.textContent = nextTorch ? '💡 Torch ON' : '🔦 Torch OFF';
          } else {
            showScannerStatus('Flashlight not supported on this device/camera.', 'info', 3000);
          }
        } catch(e) {}
      });
    }

    // -------------------------------------------------------------
    // Lightbox / Image Inspection Modal
    // -------------------------------------------------------------
    function openLightbox(src) {
      if (!photoLightbox || !lightboxImg || !src) return;
      lightboxImg.src = src;
      photoLightbox.style.display = 'flex';
    }

    function closeLightbox() {
      if (photoLightbox) photoLightbox.style.display = 'none';
    }

    if (screenshotImg) {
      screenshotImg.addEventListener('click', () => {
        if (screenshotImg.src) openLightbox(screenshotImg.src);
      });
    }
    if (screenshotFrameBox) {
      screenshotFrameBox.addEventListener('click', (e) => {
        if (screenshotImg && screenshotImg.src) openLightbox(screenshotImg.src);
      });
    }
    if (btnEnlargeScreenshot) {
      btnEnlargeScreenshot.addEventListener('click', () => {
        if (screenshotImg && screenshotImg.src) openLightbox(screenshotImg.src);
      });
    }
    if (btnCloseLightbox) {
      btnCloseLightbox.addEventListener('click', closeLightbox);
    }
    if (photoLightbox) {
      photoLightbox.addEventListener('click', (e) => {
        if (e.target === photoLightbox || e.target === lightboxImg) {
          closeLightbox();
        }
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
        stopCameraScanner();
      }
    });

    // -------------------------------------------------------------
    // Upload Screenshot Proof (for Participants & Gate Checkers)
    // -------------------------------------------------------------
    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', () => fileInput.click());
    }
    if (reuploadBtn && screenshotView && uploadView) {
      reuploadBtn.addEventListener('click', () => {
        screenshotView.style.display = 'none';
        uploadView.style.display = 'block';
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (uploadStatus) uploadStatus.textContent = 'Compressing and uploading image...';
        if (browseBtn) browseBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = async function() {
          const base64Data = reader.result;
          if (currentPass) {
            safeStorage.setItem('proof_' + currentPass, base64Data);
          }
          try {
            if (uploadStatus) uploadStatus.textContent = 'Saving to Google Drive & updating Master Sheet...';
            const res = await fetch(APPS_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'upload_screenshot',
                passId: currentPass,
                screenshotBase64: base64Data
              })
            });
            const data = await res.json();
            if (data.status === 'success') {
              if (uploadStatus) uploadStatus.textContent = 'Upload complete!';
              if (browseBtn) browseBtn.disabled = false;
              lookup(currentPass);
            } else {
              throw new Error(data.error || 'Upload failed');
            }
          } catch (err) {
            if (uploadStatus) uploadStatus.textContent = 'Proof saved locally! (Sync note: ' + err.message + ')';
            if (browseBtn) browseBtn.disabled = false;
            lookup(currentPass);
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // Initial auth check. A ?pin= link is verified by the Worker inside checkAuth().
    const isAuthed = checkAuth();

    // On page load / init(): check if pending access request exists within last 15 minutes
    if (!isAuthed) {
      const pendingEmail = safeStorage.getItem('pending_checker_email');
      const pendingTimeStr = safeStorage.getItem('pending_checker_time');
      const pendingTime = pendingTimeStr ? parseInt(pendingTimeStr, 10) : 0;
      const fifteenMinutesMs = 15 * 60 * 1000;

      if (pendingEmail) {
        if (pendingTime && (Date.now() - pendingTime > fifteenMinutesMs)) {
          safeStorage.removeItem('pending_checker_email');
          safeStorage.removeItem('pending_checker_time');
        } else {
          showTab('request');
          renderPendingRequestUI(pendingEmail);
          triggerImmediateCheck(pendingEmail);
          startStatusPolling(pendingEmail);
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
