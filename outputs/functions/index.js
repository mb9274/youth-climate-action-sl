const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

admin.initializeApp();

const db = admin.firestore();
const applicationsCollection = db.collection('applications');

function getConfig(name, fallback = '') {
  return process.env[name] || fallback;
}

function normalizeField(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseAge(value) {
  const age = Number(value);
  return Number.isFinite(age) ? age : null;
}

function validatePayload(body) {
  const fullName = normalizeField(body.fullName);
  const email = normalizeField(body.email).toLowerCase();
  const phone = normalizeField(body.phone);
  const location = normalizeField(body.location);
  const skillsInterests = normalizeField(body.skillsInterests);
  const motivation = normalizeField(body.motivation);
  const age = parseAge(body.age);

  if (!fullName) return { ok: false, error: 'Full name is required.' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'A valid email address is required.' };
  }
  if (age === null || age < 16 || age > 24) {
    return { ok: false, error: 'Age must be between 16 and 24.' };
  }
  if (!motivation) return { ok: false, error: 'Motivation for joining is required.' };

  return {
    ok: true,
    value: {
      fullName,
      age,
      email,
      phone,
      location,
      skillsInterests,
      motivation,
    },
  };
}

function resolveServiceAccount() {
  const serviceAccountJson = getConfig('FIREBASE_SERVICE_ACCOUNT_KEY');
  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson);
  }

  const projectId = getConfig('FIREBASE_PROJECT_ID');
  const clientEmail = getConfig('FIREBASE_CLIENT_EMAIL');
  const privateKey = getConfig('FIREBASE_PRIVATE_KEY');

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  throw new Error(
    'Set FIREBASE_SERVICE_ACCOUNT_KEY, or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
  );
}

function buildTransport() {
  const host = getConfig('SMTP_HOST');
  const port = Number(getConfig('SMTP_PORT', '587'));
  const user = getConfig('SMTP_USER');
  const pass = getConfig('SMTP_PASS');
  const secure = getConfig('SMTP_SECURE', 'false') === 'true';

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP_HOST, SMTP_USER, and SMTP_PASS must be configured before sending email.'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function ensureAdminApp() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(resolveServiceAccount()),
    });
  }

  return admin;
}

function formatAdminEmail(application, submissionDate) {
  return [
    'A new Join Our Team application was submitted.',
    '',
    `Full Name: ${application.fullName}`,
    `Age: ${application.age}`,
    `District/Location: ${application.location || 'Not provided'}`,
    `Email Address: ${application.email}`,
    `Phone Number: ${application.phone || 'Not provided'}`,
    `Skills and Interests: ${application.skillsInterests || 'Not provided'}`,
    `Motivation for Joining: ${application.motivation}`,
    `Submission Date: ${submissionDate.toISOString()}`,
  ].join('\n');
}

function formatApplicantEmail(application) {
  return [
    `Hi ${application.fullName},`,
    '',
    'Thanks for applying to join the Youth Climate Action SL team.',
    'We have received your application and will review it carefully.',
    'If you are selected, we will contact you with the next steps.',
    '',
    'Thank you for your interest and for caring about climate action.',
    '',
    'Best regards,',
    'Youth Climate Action SL Team',
  ].join('\n');
}

exports.submitJoinTeamApplication = onRequest({ region: 'us-central1' }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const validation = validatePayload(req.body || {});
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const application = validation.value;
    const submissionDate = new Date();
    const firebaseAdmin = ensureAdminApp();
    const db = firebaseAdmin.firestore();
    const applicationsCollection = db.collection('applications');
    const adminEmail = getConfig('ADMIN_NOTIFICATION_EMAIL', 'climateteam971@gmail.com');
    const smtpFrom = getConfig('SMTP_FROM', getConfig('SMTP_USER', adminEmail));
    const transport = buildTransport();

    const docRef = await applicationsCollection.add({
      ...application,
      submissionDate: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      source: 'join-our-team-form',
    });

    const adminMessage = {
      from: smtpFrom,
      to: adminEmail,
      subject: `New Youth Climate Action application from ${application.fullName}`,
      text: formatAdminEmail(application, submissionDate),
      replyTo: application.email,
    };

    const applicantMessage = {
      from: smtpFrom,
      to: application.email,
      subject: 'We received your Youth Climate Action application',
      text: formatApplicantEmail(application),
    };

    await transport.sendMail(adminMessage);
    await transport.sendMail(applicantMessage);

    logger.info('Application stored and notifications sent.', {
      applicationId: docRef.id,
      adminEmail,
    });

    res.status(200).json({
      ok: true,
      message: 'Thanks for applying. We will review your application and contact you if selected.',
      applicationId: docRef.id,
    });
  } catch (error) {
    logger.error('Failed to process application.', error);
    res.status(500).json({
      error: 'Unable to submit the application right now. Please try again later.',
    });
  }
});
