const dns = require('dns').promises;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const hasValidEmailDomain = async (email) => {
  const normalized = normalizeEmail(email);
  const domain = normalized.split('@')[1];
  if (!domain) return false;

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords.length > 0) return true;
  } catch {
    // Some valid domains accept mail on their A record even without MX.
  }

  try {
    const addresses = await dns.resolve4(domain);
    return addresses.length > 0;
  } catch {
    return false;
  }
};

const validateEmailForSignup = async (email) => {
  const normalized = normalizeEmail(email);

  if (!EMAIL_PATTERN.test(normalized)) {
    return { valid: false, email: normalized, message: 'Enter a valid email address.' };
  }

  if (process.env.EMAIL_DOMAIN_CHECK === 'false') {
    return { valid: true, email: normalized };
  }

  const domainOk = await hasValidEmailDomain(normalized);
  if (!domainOk) {
    return { valid: false, email: normalized, message: 'This email domain cannot receive mail.' };
  }

  return { valid: true, email: normalized };
};

module.exports = {
  normalizeEmail,
  validateEmailForSignup
};
