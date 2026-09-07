const nodemailer = require("nodemailer");

let cachedTransporter = null;

/**
 * Creates and pools a verified Nodemailer transporter
 */
const getTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  // Support custom SMTP (e.g., SendGrid, Brevo, Outlook) or default to Gmail
  const transportConfig = process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        auth: { user, pass },
        pool: true,
        maxConnections: 5,
        maxMessages: 100
      }
    : {
        service: "gmail",
        auth: { user, pass },
        pool: true
      };

  cachedTransporter = nodemailer.createTransport(transportConfig);
  return cachedTransporter;
};

/**
 * Send notification email when a task is assigned to an intern.
 * Adheres to strict Anti-Spam standards (RFC 5322 compliance):
 * 1. Plain-text fallback (critical for SpamAssassin & Gmail filters)
 * 2. Proper authenticated From & Reply-To headers
 * 3. Bulletproof inline-styled HTML container with clean typography
 * 4. Legitimate transactional headers
 */
const sendTaskAssignedEmail = async ({
  toEmail,
  internName,
  taskTitle,
  taskDescription,
  dueDate,
  priority,
  managerName
}) => {
  const user = process.env.EMAIL_USER;
  const transporter = getTransporter();

  const formattedDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : "No deadline specified";

  const priorityLabel = (priority || "medium").toUpperCase();
  const priorityColor =
    priority === "high" ? "#dc2626" : priority === "low" ? "#16a34a" : "#ea580c";

  // Anti-spam subject: Professional, specific, no caps-lock spam words
  const emailSubject = `[TaskFlow] New Task Assigned: ${taskTitle}`;

  // 1. Plain-text alternative (Prevents spam classification)
  const emailText = `Hello ${internName},

You have been assigned a new task on TaskFlow by ${managerName || "your manager"}.

TASK DETAILS:
- Title: ${taskTitle}
- Priority: ${priorityLabel}
- Due Date: ${formattedDate}
${taskDescription ? `- Instructions: ${taskDescription}\n` : ""}

Please log in to your dashboard to review task details, submit updates, and communicate with your manager:
http://localhost:4200/tasks

Best regards,
TaskFlow Management Team
`;

  // 2. High-deliverability HTML layout (Table-based, inline CSS, no external spam triggers)
  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f766e; padding: 24px 30px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">⚡ TaskFlow</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px;">Intern Management</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">New Task Assignment</h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Hello <strong>${internName}</strong>,<br>
                Manager <strong>${managerName || "Management"}</strong> has assigned a new task to you. Here are the assignment details:
              </p>

              <!-- Task Card Details -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; padding: 18px 20px;">
                <tr>
                  <td style="padding-bottom: 10px; font-size: 14px; color: #64748b; font-weight: 600; width: 110px;">Task Title:</td>
                  <td style="padding-bottom: 10px; font-size: 15px; font-weight: 700; color: #0f172a;">${taskTitle}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px; font-size: 14px; color: #64748b; font-weight: 600;">Priority:</td>
                  <td style="padding-bottom: 10px; font-size: 13px; font-weight: 700; color: ${priorityColor}; text-transform: uppercase;">
                    ● ${priorityLabel}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: ${taskDescription ? "10px" : "0"}; font-size: 14px; color: #64748b; font-weight: 600;">Due Date:</td>
                  <td style="padding-bottom: ${taskDescription ? "10px" : "0"}; font-size: 14px; color: #334155; font-weight: 600;">📅 ${formattedDate}</td>
                </tr>
                ${
                  taskDescription
                    ? `
                <tr>
                  <td style="font-size: 14px; color: #64748b; font-weight: 600; vertical-align: top;">Instructions:</td>
                  <td style="font-size: 14px; color: #334155; line-height: 1.5;">${taskDescription}</td>
                </tr>`
                    : ""
                }
              </table>

              <!-- Call to Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="http://localhost:4200/tasks" target="_blank" style="display: inline-block; background-color: #0f766e; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.25);">
                      View Task &amp; Open Discussion
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                You can directly update task progress, request feedback, and message your manager from the task discussion thread.
              </p>
            </td>
          </tr>

          <!-- Anti-Spam Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 30px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8;">
                This is an automated operational notification regarding your active internship on TaskFlow.
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${new Date().getFullYear()} TaskFlow Enterprise Management System. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  // Fallback to mock log if credentials are not configured in backend/.env
  if (!transporter || !user) {
    console.log("==================================================");
    console.log("📧 [MOCK EMAIL SERVICE - SETUP NEEDED]");
    console.log(`To: ${toEmail} (${internName})`);
    console.log(`From: ${managerName || "Manager"}`);
    console.log(`Subject: ${emailSubject}`);
    console.log("⚡ To receive REAL emails directly in your inbox:");
    console.log("   Add EMAIL_USER & EMAIL_PASS (Gmail 16-char App Password) in backend/.env");
    console.log("==================================================");
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"TaskFlow Team" <${user}>`,
      replyTo: user,
      to: toEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      headers: {
        "X-Priority": "3",
        "X-Mailer": "TaskFlow-Mailer"
      }
    });

    console.log(`✅ [REAL-TIME EMAIL DELIVERED] ID: ${info.messageId} to ${toEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send real email:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendTaskAssignedEmail
};
