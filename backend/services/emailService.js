let nodemailer = null;

try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

const frontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const createTransport = () => {
  if (!process.env.SMTP_HOST || !nodemailer) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  const from = process.env.MAIL_FROM || 'SportMate <no-reply@sportmate.local>';
  const transport = createTransport();

  if (!transport) {
    console.log('[email:dry-run]', { to, from, subject, text });
    return { dryRun: true };
  }

  return transport.sendMail({ from, to, subject, text, html });
};

const sendWelcomeEmail = (user) => sendMail({
  to: user.email,
  subject: 'Welcome to SportMate',
  text: `Hi ${user.name}, welcome to SportMate. Find nearby players, send match requests, and start playing more.`,
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1a1a1a">
      <h2>Welcome to SportMate, ${user.name}.</h2>
      <p>Your account is ready. You can now discover nearby players, send match requests, and coordinate games.</p>
      <p><a href="${frontendUrl()}" style="color:#1D9E75;font-weight:700">Open SportMate</a></p>
    </div>
  `
});

const sendPasswordResetEmail = (user, resetUrl) => sendMail({
  to: user.email,
  subject: 'Reset your SportMate password',
  text: `Hi ${user.name}, reset your SportMate password here: ${resetUrl}. This link expires in 1 hour.`,
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1a1a1a">
      <h2>Reset your password</h2>
      <p>Hi ${user.name}, use this secure link to set a new SportMate password. It expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="color:#1D9E75;font-weight:700">Reset password</a></p>
    </div>
  `
});

const matchCopy = (type, sender, match) => {
  const sport = match?.sport || 'your match';
  const court = match?.court?.name ? ` at ${match.court.name}` : '';
  const name = sender?.name || 'Someone';

  if (type === 'match_request') return `${name} wants to play ${sport}${court}.`;
  if (type === 'match_accepted') return `${name} accepted your ${sport} request${court}.`;
  if (type === 'match_declined') return `${name} declined your ${sport} request.`;
  if (type === 'match_cancelled') return `${name} cancelled the ${sport} match${court}.`;
  return 'You have a SportMate update.';
};

const sendMatchNotificationEmail = ({ recipient, sender, match, type }) => {
  const message = matchCopy(type, sender, match);
  return sendMail({
    to: recipient.email,
    subject: 'SportMate match update',
    text: `${message}\n\nOpen SportMate: ${frontendUrl()}/notifications`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1a1a1a">
        <h2>SportMate match update</h2>
        <p>${message}</p>
        <p><a href="${frontendUrl()}/notifications" style="color:#1D9E75;font-weight:700">View notification</a></p>
      </div>
    `
  });
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendMatchNotificationEmail
};
