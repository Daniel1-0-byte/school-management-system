/**
 * External API Constants
 * All external API endpoints and URLs defined here for easy management
 */

// Google reCAPTCHA
export const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
export const RECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js';

// reCAPTCHA Configuration
export const RECAPTCHA_CONFIG = {
  verifyUrl: RECAPTCHA_VERIFY_URL,
  scriptUrl: RECAPTCHA_SCRIPT_URL,
  minScore: parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5'),
};
