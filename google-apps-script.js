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
    '&bull; For questions, contact student organizers: Md. Sohail (+91 80083 91525) or S. Arun (+91 83280 12134).' +
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
        data.phone || "N/A",
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
        data.phone || "N/A",
        data.tier || data.type || "N/A",
        data.message || data.reason || "N/A",
        data.timestamp || new Date().toISOString()
      ]);
    }

    var verifyUrl = "https://force-racing.force-racing-revival.workers.dev/verify.html?pass=" + encodeURIComponent(passId);
    var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=" + encodeURIComponent(verifyUrl);

    if (isSimReg && data.email && data.sendEmail !== false) {
      try {
        var emailHtml = buildF1EmailHtml(data, passId, qrUrl, verifyUrl);
        MailApp.sendEmail({
          to: data.email,
          subject: "🏁 OFFICIAL PADDOCK CREDENTIAL // F1 Sim Racing - Pass #" + passId,
          htmlBody: emailHtml
        });
      } catch (errMail) {}
    }

    if (data.sendEmail !== false && data.recipientEmail) {
      try {
        MailApp.sendEmail(
          data.recipientEmail,
          "[Force Racing Bot] New " + (isSimReg ? "F1 Sim Registration" : data.type) + ": " + (data.name || "Participant") + " (" + passId + ")",
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
      sheetUrl: ss.getUrl()
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
      var passId = String(p.pass).trim();
      var sheet = ss.getSheetByName("F1_Simulator");
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]).trim().toUpperCase() === passId.toUpperCase()) {
            return ContentService.createTextOutput(JSON.stringify({
              status: "found",
              passId: data[i][0],
              name: data[i][1],
              organization: data[i][2],
              email: data[i][3],
              phone: data[i][4],
              slot: data[i][5],
              paymentStatus: data[i][6],
              driveUrl: data[i][7],
              timestamp: data[i][8]
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "not_found", passId: passId })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "online", sheetUrl: ss.getUrl() })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
