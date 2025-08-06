"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationCode = exports.onEmailQueued = exports.processEmailQueue = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
// Initialize Firebase Admin
admin.initializeApp();
// Email configuration
const emailConfig = {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
        user: process.env.EMAIL_USER || "",
        pass: process.env.EMAIL_PASS || "",
    },
};
// Create transporter
const transporter = nodemailer.createTransport(emailConfig);
// Cloud Function to process email queue
exports.processEmailQueue = functions.pubsub
    .schedule("every 1 minutes")
    .onRun(async (context) => {
    const db = admin.firestore();
    try {
        // Get pending emails
        const pendingEmails = await db
            .collection("emailQueue")
            .where("status", "==", "pending")
            .where("attempts", "<", "maxAttempts")
            .limit(10) // Process 10 emails at a time
            .get();
        if (pendingEmails.empty) {
            console.log("No pending emails to process");
            return null;
        }
        const batch = db.batch();
        const promises = [];
        pendingEmails.forEach((doc) => {
            const emailData = doc.data();
            // Update attempt count
            batch.update(doc.ref, {
                attempts: admin.firestore.FieldValue.increment(1),
                lastAttempt: new Date().toISOString(),
            });
            // Send email
            const sendPromise = sendEmail(emailData)
                .then((success) => {
                if (success) {
                    batch.update(doc.ref, {
                        status: "sent",
                        sentAt: new Date().toISOString(),
                    });
                }
                else {
                    batch.update(doc.ref, {
                        status: "failed",
                        failedAt: new Date().toISOString(),
                    });
                }
            })
                .catch((error) => {
                console.error(`Failed to send email ${doc.id}:`, error);
                batch.update(doc.ref, {
                    status: "failed",
                    failedAt: new Date().toISOString(),
                    error: error.message,
                });
            });
            promises.push(sendPromise);
        });
        // Wait for all emails to be processed
        await Promise.all(promises);
        // Commit all updates
        await batch.commit();
        console.log(`Processed ${pendingEmails.size} emails`);
        return null;
    }
    catch (error) {
        console.error("Error processing email queue:", error);
        return null;
    }
});
// Cloud Function triggered when new email is added to queue
exports.onEmailQueued = functions.firestore
    .document("emailQueue/{emailId}")
    .onCreate(async (snap, context) => {
    const emailData = snap.data();
    try {
        const success = await sendEmail(emailData);
        if (success) {
            await snap.ref.update({
                status: "sent",
                sentAt: new Date().toISOString(),
            });
        }
        else {
            await snap.ref.update({
                status: "failed",
                failedAt: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        console.error("Error sending email:", error);
        await snap.ref.update({
            status: "failed",
            failedAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
// Helper function to send email
async function sendEmail(emailData) {
    try {
        if (!emailConfig.auth.user || !emailConfig.auth.pass) {
            console.log("Email configuration not set up");
            return false;
        }
        const mailOptions = {
            from: emailData.from || process.env.EMAIL_FROM || emailConfig.auth.user,
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${emailData.to}`);
        return true;
    }
    catch (error) {
        console.error("Failed to send email:", error);
        return false;
    }
}
// Cloud Function to send verification code directly (alternative approach)
exports.sendVerificationCode = functions.https.onCall(async (data, context) => {
    // Verify the request is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { email, code, type } = data;
    if (!email || !code || !type) {
        throw new functions.https.HttpsError("invalid-argument", "Email, code, and type are required");
    }
    try {
        const success = await sendEmail({
            to: email,
            subject: `${type === "login" ? "Login" : "Registration"} Verification Code - Joanna K Cosmetics`,
            html: generateVerificationEmailHTML(email, code, type),
        });
        return { success };
    }
    catch (error) {
        console.error("Error sending verification code:", error);
        throw new functions.https.HttpsError("internal", "Failed to send verification code");
    }
});
// Helper function to generate verification email HTML
function generateVerificationEmailHTML(email, code, type) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Code</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .code {
          background: white;
          border: 2px solid #ec4899;
          border-radius: 10px;
          padding: 20px;
          text-align: center;
          font-size: 32px;
          font-weight: bold;
          color: #ec4899;
          letter-spacing: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #6b7280;
          font-size: 14px;
        }
        .warning {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 5px;
          padding: 15px;
          margin: 20px 0;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Joanna K Cosmetics</h1>
        <p>Premium Cosmetics & Virtual Try-On</p>
      </div>
      
      <div class="content">
        <h2>Your Verification Code</h2>
        <p>Hello!</p>
        <p>You requested a ${type} verification code for your Joanna K Cosmetics account.</p>
        
        <div class="code">${code}</div>
        
        <p>Please enter this 6-digit code in the verification field to complete your ${type}.</p>
        
        <div class="warning">
          <strong>Important:</strong>
          <ul>
            <li>This code will expire in 10 minutes</li>
            <li>Never share this code with anyone</li>
            <li>If you didn't request this code, please ignore this email</li>
          </ul>
        </div>
        
        <p>If you have any questions, please contact our support team.</p>
        
        <p>Best regards,<br>The Joanna K Cosmetics Team</p>
      </div>
      
      <div class="footer">
        <p>This email was sent to ${email}</p>
        <p>&copy; 2024 Joanna K Cosmetics. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}
//# sourceMappingURL=index.js.map