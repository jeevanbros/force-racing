function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (err) {}

  var storedId = props.getProperty("FORCE_SPREADSHEET_ID");
  if (storedId) {
    try {
      return SpreadsheetApp.openById(storedId);
    } catch (err) {
      storedId = null;
    }
  }

  var newSheet = SpreadsheetApp.create("Force Racing Master Database");
  props.setProperty("FORCE_SPREADSHEET_ID", newSheet.getId());
  return newSheet;
}

function getPaymentFolder() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("PAYMENT_FOLDER_ID");
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      folderId = null;
    }
  }
  var folders = DriveApp.getFoldersByName("Force Racing Payment Proofs");
  if (folders.hasNext()) {
    var folder = folders.next();
    props.setProperty("PAYMENT_FOLDER_ID", folder.getId());
    return folder;
  }
  var newFolder = DriveApp.createFolder("Force Racing Payment Proofs");
  props.setProperty("PAYMENT_FOLDER_ID", newFolder.getId());
  return newFolder;
}

function sanitizeCell(val) {
  if (val === null || val === undefined) return "N/A";
  var s = String(val).trim();
  if (s.length > 0 && (s.charAt(0) === '+' || s.charAt(0) === '=' || s.charAt(0) === '-')) {
    return "'" + s;
  }
  return s || "N/A";
}

function generatePassId() {
  var num = Math.floor(10000 + Math.random() * 90000);
  return "FR26-SIM-" + num;
}

function buildF1EmailHtml(data, passId, qrUrl, verifyUrl) {
  var name = (data.name || "Formula Pilot").toUpperCase();
  var college = data.companyName || data.organization || data.rollNumber || "KITS Warangal";
  var phone = data.phone || "N/A";
  var email = data.email || "N/A";

  return '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8">' +
    '<style>' +
    'body { margin: 0; padding: 0; background-color: #0c0d10; font-family: "Segoe UI", Arial, sans-serif; color: #f2f2f2; }' +
    '.wrapper { width: 100%; max-width: 640px; margin: 0 auto; background-color: #121318; border: 1px solid #23252d; border-radius: 8px; overflow: hidden; }' +
    '.header { background: linear-gradient(135deg, #181920 0%, #0d0e12 100%); padding: 28px 24px 20px; border-bottom: 3px solid #ff1801; text-align: center; }' +
    '.team-title { font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; text-transform: uppercase; }' +
    '.team-sub { font-size: 11px; letter-spacing: 3px; color: #ff1801; margin-top: 4px; text-transform: uppercase; font-weight: 700; }' +
    '.badge { display: inline-block; background-color: #20222a; border: 1px solid #363945; color: #00f0ff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 4px; margin-top: 14px; letter-spacing: 1.5px; }' +
    '.content { padding: 28px 24px; }' +
    '.hero-callout { background-color: #181a22; border-left: 4px solid #ff1801; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 6px 6px 0; }' +
    '.hero-callout h2 { margin: 0 0 6px; font-size: 18px; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; }' +
    '.hero-callout p { margin: 0; font-size: 14px; color: #a2a6b4; line-height: 1.5; }' +
    '.card { background: linear-gradient(145deg, #16171f, #1b1c26); border: 2px solid #ff1801; border-radius: 10px; padding: 24px; position: relative; margin: 24px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }' +
    '.pass-tag { font-size: 11px; color: #ff1801; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }' +
    '.pass-id { font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: 3px; margin: 4px 0 16px; font-family: monospace; }' +
    '.grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }' +
    '.grid td { padding: 6px 0; vertical-align: top; }' +
    '.grid .lbl { width: 35%; font-size: 12px; color: #767b8d; text-transform: uppercase; letter-spacing: 1px; }' +
    '.grid .val { width: 65%; font-size: 14px; color: #ffffff; font-weight: 600; }' +
    '.qr-box { text-align: center; background-color: #ffffff; padding: 14px; border-radius: 8px; display: inline-block; margin: 10px auto; }' +
    '.qr-box img { display: block; width: 180px; height: 180px; margin: 0 auto; }' +
    '.qr-caption { font-size: 11px; color: #111; font-weight: bold; margin-top: 6px; letter-spacing: 1px; }' +
    '.cta-btn { display: block; text-align: center; background: linear-gradient(90deg, #ff1801, #e10600); color: #ffffff !important; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 16px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0; box-shadow: 0 4px 16px rgba(255,24,1,0.4); }' +
    '.instruction-box { background-color: #171922; border: 1px dashed #343744; border-radius: 6px; padding: 16px; margin-top: 20px; font-size: 13px; color: #9da2b4; line-height: 1.6; }' +
    '.instruction-box strong { color: #ffffff; }' +
    '.footer { background-color: #0f1014; padding: 20px 24px; border-top: 1px solid #1c1d25; text-align: center; font-size: 12px; color: #5a5f70; line-height: 1.6; }' +
    '.footer a { color: #848a9e; text-decoration: none; }' +
    '</style></head>' +
    '<body><div class="wrapper">' +
    '<div class="header">' +
    '<p class="team-sub">Formula Student · KITS Warangal</p>' +
    '<h1 class="team-title">FORCE RACING</h1>' +
    '<span class="badge">SUMSHODHINI ’26 · OFFICIAL PADDOCK CREDENTIAL</span>' +
    '</div>' +
    '<div class="content">' +
    '<div class="hero-callout">' +
    '<h2>READY ON THE STARTING GRID</h2>' +
    '<p>Welcome to the Force Racing F1 Sim Racing Experience. Your official pilot credential has been provisioned. Present your QR pass at the Central Workshop pit lane entrance.</p>' +
    '</div>' +
    '<div class="card">' +
    '<span class="pass-tag">TRACKSIDE PILOT PASS</span>' +
    '<div class="pass-id">' + passId + '</div>' +
    '<table class="grid">' +
    '<tr><td class="lbl">PILOT NAME</td><td class="val">' + name + '</td></tr>' +
    '<tr><td class="lbl">COLLEGE / ORG</td><td class="val">' + college + '</td></tr>' +
    '<tr><td class="lbl">MOBILE</td><td class="val">' + phone + '</td></tr>' +
    '<tr><td class="lbl">VENUE</td><td class="val">Central Workshop, KITS Warangal</td></tr>' +
    '<tr><td class="lbl">EVENT DATE</td><td class="val">31 October 2026</td></tr>' +
    '<tr><td class="lbl">ENTRY FEE</td><td class="val">₹99 per participant</td></tr>' +
    '</table>' +
    '<div style="text-align:center;">' +
    '<div class="qr-box">' +
    '<img src="' + qrUrl + '" alt="Trackside Verification QR Code">' +
    '<div class="qr-caption">SCAN FOR TRACKSIDE VERIFY &amp; PAYMENT</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<a class="cta-btn" href="' + verifyUrl + '" target="_blank">UPLOAD PAYMENT PROOF / VIEW LIVE PASS &rarr;</a>' +
    '<div class="instruction-box">' +
    '<strong>Trackside Verification Instructions:</strong><br>' +
    '&bull; Please pay the ₹99 registration fee via UPI.<br>' +
    '&bull; Click the button above to upload your payment screenshot or do it at the pit lane registration desk.<br>' +
    '&bull; Keep this email or save your QR code on your phone for immediate trackside check-in.<br>' +
    '&bull; For questions, contact student organizers: <a href="tel:+918008391525" style="color:#d9231d;text-decoration:none;font-weight:bold;">Md. Sohail</a> or <a href="tel:+918328012134" style="color:#d9231d;text-decoration:none;font-weight:bold;">S. Arun</a>.<br>' +
    '</div>' +
    '</div>' +
    '<div class="footer">' +
    '<p>Department of Mechanical Engineering, Kakatiya Institute of Technology &amp; Science, Warangal - 506015.<br>' +
    '&copy; 2026 Force Racing India. Student built. Race driven.</p>' +
    '</div>' +
    '</div></body></html>';
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = getSpreadsheet();
    var action = data.action || "submit";

    if (action === "test_email") {
      var targetEmail = String(data.email || "team.force.racing.kitsw@gmail.com").trim();
      var testPass = "FR26-SIM-TEST-" + Math.floor(1000 + Math.random() * 9000);
      var testVerify = "https://force-racing.force-racing-revival.workers.dev/verify.html?pass=" + testPass;
      var testQr = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=" + encodeURIComponent(testVerify);
      var testHtml = buildF1EmailHtml({ name: data.name || "Test Pilot", email: targetEmail, organization: "KITS Warangal" }, testPass, testQr, testVerify);
      var sentOk = false, sendMethod = null, sendErr = null;
      try {
        MailApp.sendEmail({ to: targetEmail, subject: "🏁 [TEST PASS] Official Credential // " + testPass, body: "Test pass email. Verify: " + testVerify, htmlBody: testHtml, name: "Force Racing" });
        sentOk = true; sendMethod = "MailApp";
      } catch (e1) {
        try {
          GmailApp.sendEmail(targetEmail, "🏁 [TEST PASS] Official Credential // " + testPass, "Test pass email. Verify: " + testVerify, { htmlBody: testHtml, name: "Force Racing" });
          sentOk = true; sendMethod = "GmailApp";
        } catch (e2) {
          sendErr = "MailApp: " + e1.toString() + " | GmailApp: " + e2.toString();
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: sentOk ? "success" : "error", sent: sentOk, method: sendMethod, error: sendErr, recipient: targetEmail })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "upload_screenshot") {
      var passId = data.passId;
      var base64Data = data.screenshotBase64;
      if (!passId || !base64Data) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "Missing passId or image data." })).setMimeType(ContentService.MimeType.JSON);
      }

      var folder = getPaymentFolder();
      var cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
      var bytes = Utilities.base64Decode(cleanBase64);
      var blob = Utilities.newBlob(bytes, "image/jpeg", passId + "_payment_proof.jpg");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var driveUrl = file.getUrl();

      var sheet = ss.getSheetByName("F1_Simulator");
      if (sheet) {
        var values = sheet.getDataRange().getValues();
        for (var r = 1; r < values.length; r++) {
          if (String(values[r][0]).trim() === String(passId).trim()) {
            sheet.getRange(r + 1, 7).setValue("Payment Proof Uploaded");
            sheet.getRange(r + 1, 8).setValue(driveUrl);
            break;
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        passId: passId,
        paymentStatus: "Payment Proof Uploaded",
        driveUrl: driveUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "request_checker_access") {
      var applicantName = data.name || "Trackside Applicant";
      var applicantEmail = data.email || "N/A";
      var applicantRole = data.role || data.organization || "Volunteer Checker";
      var applicantPhone = data.phone || "N/A";
      var applicantPurpose = data.reason || "Gate Pass Verification";
      var approveUrl = data.approveUrl || ("https://force-racing.force-racing-revival.workers.dev/api/checker/decision?token=" + (data.token || "") + "&decision=approve");
      var rejectUrl = data.rejectUrl || ("https://force-racing.force-racing-revival.workers.dev/api/checker/decision?token=" + (data.token || "") + "&decision=reject");
      var adminTarget = "jeevanko83@gmail.com,team.force.racing.kitsw@gmail.com";
      if (data.adminEmail && data.adminEmail.trim()) {
        adminTarget = data.adminEmail.trim();
        if (adminTarget.indexOf("jeevanko83@gmail.com") === -1) {
          adminTarget = "jeevanko83@gmail.com," + adminTarget;
        }
        if (adminTarget.indexOf("team.force.racing.kitsw@gmail.com") === -1) {
          adminTarget = adminTarget + ",team.force.racing.kitsw@gmail.com";
        }
      }
      var adminRecipient = adminTarget;

      var emailHtml = data.htmlBody || data.html || (
        '<!DOCTYPE html><html><body style="margin:0;background:#090b10;font-family:Segoe UI,Roboto,sans-serif;color:#f8fafc;padding:24px;">' +
        '<div style="max-width:620px;margin:0 auto;background:#111524;border:1px solid #00f0ff;border-radius:12px;padding:26px;">' +
        '<div style="text-align:center;margin-bottom:20px;">' +
        '<h2 style="color:#00f0ff;margin:0 0 6px;letter-spacing:1px;font-size:22px;">FORCE RACING GATEKEEPER ACCESS</h2>' +
        '<p style="color:#94a3b8;font-size:13px;margin:0;">Sumshodhini Pass Verification Console · Administrator Action Required</p>' +
        '</div>' +
        '<div style="background:#090b10;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:18px;margin-bottom:20px;">' +
        '<h3 style="color:#ff1801;margin-top:0;font-size:15px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:6px;">Applicant Details</h3>' +
        '<p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Full Name:</strong> <span style="color:#fff;">' + applicantName + '</span></p>' +
        '<p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Email Address:</strong> <span style="color:#00f0ff;">' + applicantEmail + '</span></p>' +
        '<p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Phone Number:</strong> <span style="color:#fff;">' + applicantPhone + '</span></p>' +
        '<p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Station / Role:</strong> <span style="color:#fff;">' + applicantRole + '</span></p>' +
        '<p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Stated Purpose:</strong> <span style="color:#cbd5e1;">' + applicantPurpose + '</span></p>' +
        '</div>' +
        '<div style="background:#181e30;border-left:4px solid #ffb703;padding:12px 16px;border-radius:4px;margin-bottom:24px;">' +
        '<p style="margin:0;color:#ffb703;font-weight:700;font-size:13px;">DECISION REQUIRED:</p>' +
        '<p style="margin:4px 0 0;color:#cbd5e1;font-size:12px;">This applicant cannot sign into the pass checker until you approve access. Clicking below will instantly authorize them and generate their password.</p>' +
        '</div>' +
        '<div style="text-align:center;margin:26px 0;">' +
        '<a href="' + approveUrl + '" style="background:linear-gradient(90deg,#ff1801,#d90429);color:#ffffff;font-size:14px;font-weight:800;padding:14px 28px;border-radius:6px;text-decoration:none;display:inline-block;margin-bottom:12px;">' +
        'REQUEST ACCESS AND SEND PASSWORD &rarr;' +
        '</a><br>' +
        '<a href="' + rejectUrl + '" style="background:transparent;border:1px solid #ff334b;color:#ff334b;font-size:12px;font-weight:700;padding:8px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:6px;">' +
        'Deny Access' +
        '</a>' +
        '<p style="font-size:11px;color:#64748b;margin-top:14px;">Master Emergency Unlock: <a href="https://force-racing.force-racing-revival.workers.dev/verify.html?pin=forceadmin2026" style="color:#00f0ff;">pin=forceadmin2026</a></p>' +
        '</div>' +
        '<p style="text-align:center;font-size:11px;color:#64748b;margin-top:24px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">' +
        'Force Racing India · Kakatiya Institute of Technology &amp; Science, Warangal' +
        '</p>' +
        '</div></body></html>'
      );

      var plainText = data.message || (
        "Pass Checker Access Request from " + applicantName + " (" + applicantEmail + ")\n" +
        "Role: " + applicantRole + "\n" +
        "Phone: " + applicantPhone + "\n" +
        "Reason: " + applicantPurpose + "\n\n" +
        "APPROVE & SEND PASSWORD:\n" + approveUrl + "\n\n" +
        "DENY ACCESS:\n" + rejectUrl + "\n\n" +
        "Master PIN: https://force-racing.force-racing-revival.workers.dev/verify.html?pin=forceadmin2026"
      );

      try {
        MailApp.sendEmail({
          to: adminTarget,
          subject: "🚨 [ACTION REQUIRED] Sumshodhini Pass Checker Access Request - " + applicantName,
          body: plainText,
          htmlBody: emailHtml
        });
      } catch (errMail) {
        try {
          MailApp.sendEmail(
            adminTarget,
            "🚨 [ACTION REQUIRED] Sumshodhini Pass Checker Access Request - " + applicantName,
            plainText,
            { htmlBody: emailHtml }
          );
        } catch (errFallback) {}
      }

      var accessSheet = ss.getSheetByName("Checker_Access_Requests");
      if (!accessSheet) {
        accessSheet = ss.insertSheet("Checker_Access_Requests");
        accessSheet.appendRow(["Name", "Email", "Phone", "Role", "Purpose", "Timestamp"]);
        accessSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#1E1E1E").setFontColor("#FFFFFF");
      }
      accessSheet.appendRow([applicantName, applicantEmail, applicantPhone, applicantRole, applicantPurpose, new Date().toISOString()]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Access request submitted."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "approve_checker_access") {
      var applicantName = data.name || "Authorized Checker";
      var applicantEmail = data.email || data.recipientEmail;
      var password = data.password || "";
      var verifyUrl = "https://force-racing.force-racing-revival.workers.dev/verify.html";

      if (applicantEmail && password) {
        var userEmailHtml = data.htmlBody || data.html || (
          '<!DOCTYPE html><html><body style="margin:0;background:#090b10;font-family:Segoe UI,Roboto,sans-serif;color:#f8fafc;padding:24px;">' +
          '<div style="max-width:580px;margin:0 auto;background:#111524;border:1.5px solid #10b981;border-radius:10px;padding:24px;">' +
          '<h2 style="color:#10b981;margin-top:0;">Access Approved: Force Racing Pass Checker</h2>' +
          '<p>Hello <strong>' + applicantName + '</strong>,</p>' +
          '<p>The Administrator has approved your request to access the Sumshodhini ’26 Pass Checker verification console.</p>' +
          '<div style="background:#090b10;border:1px dashed #00f0ff;border-radius:8px;padding:18px;margin:20px 0;text-align:center;">' +
          '<p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;">Assigned Access Password</p>' +
          '<div style="font-family:monospace;font-size:26px;font-weight:800;color:#ffb703;letter-spacing:3px;">' + password + '</div>' +
          '<p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">Email: <span style="color:#00f0ff;">' + applicantEmail + '</span></p>' +
          '</div>' +
          '<p style="font-size:14px;color:#cbd5e1;">Go to the Pass Checker console and enter your email and password above to begin credential scanning.</p>' +
          '<div style="text-align:center;margin:24px 0;">' +
          '<a href="' + verifyUrl + '" style="background:linear-gradient(90deg,#00f0ff,#0284c7);color:#000;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:6px;text-decoration:none;display:inline-block;">Open Pass Checker &rarr;</a>' +
          '</div>' +
          '<p style="font-size:12px;color:#64748b;text-align:center;margin-top:20px;">Force Racing India · Kakatiya Institute of Technology &amp; Science, Warangal</p>' +
          '</div></body></html>'
        );

        var plainText = data.message || (
          "Hello " + applicantName + ",\n\n" +
          "Your Sumshodhini '26 Pass Checker access has been approved by the Administrator.\n\n" +
          "Your Official Sign-In Credentials:\n" +
          "Email: " + applicantEmail + "\n" +
          "Assigned Password: " + password + "\n\n" +
          "Sign in here: " + verifyUrl
        );

        try {
          MailApp.sendEmail({
            to: applicantEmail,
            subject: "✅ Pass Checker Access Approved - Your Login Password Inside",
            body: plainText,
            htmlBody: userEmailHtml
          });
        } catch (errMail) {
          try {
            MailApp.sendEmail(
              applicantEmail,
              "✅ Pass Checker Access Approved - Your Login Password Inside",
              plainText,
              { htmlBody: userEmailHtml }
            );
          } catch (errFallback) {}
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Applicant credentials dispatched."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var isSimReg = (data.type === "registration" || data.eventSheet === "F1_Simulator");
    var sheetName = isSimReg ? "F1_Simulator" : (String(data.eventSheet || data.type || "Submissions").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40));
    var sheet = ss.getSheetByName(sheetName);

    var passId = data.reference || data.id;
    if (isSimReg && (!passId || passId.indexOf("FR26-SIM-") !== 0)) {
      passId = generatePassId();
    }

    var driveUrl = "";
    if (data.screenshotBase64) {
      try {
        var folder = getPaymentFolder();
        var cleanBase64 = data.screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
        var bytes = Utilities.base64Decode(cleanBase64);
        var blob = Utilities.newBlob(bytes, "image/jpeg", passId + "_payment_proof.jpg");
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        driveUrl = file.getUrl();
      } catch (errDrive) {}
    }

    var paymentStatus = driveUrl ? "Payment Proof Uploaded" : "Pending Upload";

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      if (isSimReg) {
        sheet.appendRow(["Pass ID", "Name", "Roll No / College", "Email", "Phone", "Category / Slot", "Payment Status", "Drive Screenshot URL", "Timestamp"]);
      } else {
        sheet.appendRow(["Reference ID", "Name", "Roll No / Organization", "Email", "Phone", "Category / Tier", "Details", "Timestamp"]);
      }
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#1E1E1E").setFontColor("#FFFFFF");
    }

    if (isSimReg) {
      sheet.appendRow([
        passId,
        data.name || "N/A",
        data.rollNumber || data.organization || data.companyName || "N/A",
        data.email || "N/A",
        sanitizeCell(data.phone),
        data.slot || data.subsystem || "F1 Sim Racing (31 Oct 2026)",
        paymentStatus,
        driveUrl,
        data.timestamp || new Date().toISOString()
      ]);
    } else {
      sheet.appendRow([
        passId || ("FR-" + Utilities.getUuid().substring(0, 8).toUpperCase()),
        data.name || data.companyName || "N/A",
        data.rollNumber || data.contactPerson || data.organization || "N/A",
        data.email || "N/A",
        sanitizeCell(data.phone),
        data.tier || data.type || "N/A",
        data.message || data.reason || "N/A",
        data.timestamp || new Date().toISOString()
      ]);
    }

    var verifyUrl = "https://force-racing.force-racing-revival.workers.dev/verify.html?pass=" + encodeURIComponent(passId);
    var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=" + encodeURIComponent(verifyUrl);

    var emailResult = { attempted: false, sent: false, method: null, error: null };
    var cleanEmail = String(data.email || "").trim();

    if (isSimReg && cleanEmail && cleanEmail.indexOf("@") !== -1 && data.sendEmail !== false) {
      emailResult.attempted = true;
      var f1PlainText = "Welcome to Force Racing F1 Sim Racing Experience.\n" +
        "Pass ID: " + passId + "\n" +
        "Pilot: " + (data.name || "Formula Pilot") + "\n" +
        "Trackside Pass & Proof Upload: " + verifyUrl + "\n\n" +
        "Present your Pass ID or QR code at Central Workshop, KITS Warangal on 31 October 2026.";

      var emailHtml = "";
      try {
        emailHtml = buildF1EmailHtml(data, passId, qrUrl, verifyUrl);
      } catch (errBuild) {
        emailHtml = f1PlainText;
      }

      // Tier 1: Try MailApp with options object
      try {
        MailApp.sendEmail({
          to: cleanEmail,
          subject: "🏁 OFFICIAL PADDOCK CREDENTIAL // F1 Sim Racing - Pass #" + passId,
          body: f1PlainText,
          htmlBody: emailHtml,
          name: "Force Racing F1 Sim"
        });
        emailResult.sent = true;
        emailResult.method = "MailApp";
      } catch (errMail) {
        // Tier 2: Try GmailApp
        try {
          GmailApp.sendEmail(cleanEmail, "🏁 OFFICIAL PADDOCK CREDENTIAL // F1 Sim Racing - Pass #" + passId, f1PlainText, {
            htmlBody: emailHtml,
            name: "Force Racing F1 Sim"
          });
          emailResult.sent = true;
          emailResult.method = "GmailApp";
        } catch (errGmail) {
          // Tier 3: Positional MailApp (plain text fallback)
          try {
            MailApp.sendEmail(cleanEmail, "🏁 OFFICIAL PADDOCK CREDENTIAL // F1 Sim Racing - Pass #" + passId, f1PlainText);
            emailResult.sent = true;
            emailResult.method = "MailAppPositional";
          } catch (errPos) {
            emailResult.error = "MailApp: " + errMail.toString() + " | GmailApp: " + errGmail.toString();
          }
        }
      }
    }

    if (data.sendEmail !== false && data.recipientEmail) {
      try {
        var subject = data.subject || (
          data.type === "Pass Checker Access Approved"
            ? "✅ Pass Checker Access Approved - Your Login Password Inside"
            : data.type === "Pass Checker Access Request"
              ? ("🚨 [ACTION REQUIRED] Sumshodhini Pass Checker Access Request - " + (data.name || "Applicant"))
              : ("[Force Racing Bot] New " + (isSimReg ? "F1 Sim Registration" : data.type) + ": " + (data.name || "Participant") + " (" + passId + ")")
        );

        var plainBody = data.message || (
          "New submission received on Force Racing Platform:\n\n" +
          "Pass/Ref: " + passId + "\n" +
          "Name: " + (data.name || "N/A") + "\n" +
          "Email: " + (data.email || "N/A") + "\n" +
          "Phone: " + (data.phone || "N/A") + "\n" +
          "College/Org: " + (data.organization || data.rollNumber || "N/A") + "\n" +
          "Status: " + paymentStatus + "\n" +
          "Screenshot URL: " + (driveUrl || "Pending") + "\n" +
          "Verification URL: " + verifyUrl + "\n" +
          "Spreadsheet: " + ss.getUrl()
        );

        var mailOpts = {};
        if (data.htmlBody || data.html) {
          mailOpts.htmlBody = data.htmlBody || data.html;
        }

        MailApp.sendEmail(data.recipientEmail, subject, plainBody, mailOpts);
      } catch (errAlert) {}
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      passId: passId,
      reference: passId,
      paymentStatus: paymentStatus,
      driveUrl: driveUrl,
      verifyUrl: verifyUrl,
      qrUrl: qrUrl,
      sheetUrl: ss.getUrl(),
      emailResult: emailResult
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = getSpreadsheet();
    var p = e && e.parameter ? e.parameter : {};

    if (p.action === "verify" && p.pass) {
      var rawPass = String(p.pass).trim();
      var cleanPass = rawPass.replace(/^(pass\s*#?|id\s*#?|#)\s*/i, "").replace(/[.,;:!?]+$/, "").trim();
      var passId = cleanPass.toUpperCase();
      var withPrefix = passId.indexOf("FR26-SIM-") === 0 ? passId : ("FR26-SIM-" + passId);
      var phoneDigits = rawPass.replace(/\D/g, "");
      var emailLower = rawPass.toLowerCase();

      var sheets = ss.getSheets();
      for (var s = 0; s < sheets.length; s++) {
        var sheet = sheets[s];
        var data = sheet.getDataRange().getValues();
        if (data.length <= 1) continue;

        for (var i = 1; i < data.length; i++) {
          var rowPass = String(data[i][0] || "").trim().toUpperCase();
          var rowName = String(data[i][1] || "").trim();
          var rowOrg = String(data[i][2] || "").trim();
          var rowEmail = String(data[i][3] || "").trim().toLowerCase();
          var rowPhone = String(data[i][4] || "").replace(/\D/g, "");

          var isMatch = (rowPass === passId || rowPass === withPrefix || rowPass.indexOf(passId) !== -1 || (passId.length >= 6 && rowPass.indexOf(passId) !== -1));
          if (!isMatch && emailLower.indexOf("@") !== -1 && rowEmail === emailLower) isMatch = true;
          if (!isMatch && phoneDigits.length >= 7 && (rowPhone.indexOf(phoneDigits) !== -1 || phoneDigits.indexOf(rowPhone) !== -1)) isMatch = true;

          if (isMatch) {
            return ContentService.createTextOutput(JSON.stringify({
              status: "found",
              passId: data[i][0] || passId,
              name: data[i][1] || "Formula Pilot",
              organization: data[i][2] || "KITS Warangal",
              email: data[i][3] || "N/A",
              phone: data[i][4] || "N/A",
              slot: data[i][5] || "F1 Sim Racing Challenge (31 Oct 2026)",
              paymentStatus: data[i][6] || "Pending",
              driveUrl: data[i][7] || "",
              timestamp: data[i][8] || new Date().toISOString()
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "not_found", passId: rawPass })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "online", sheetUrl: ss.getUrl() })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
