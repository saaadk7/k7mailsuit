/**
 * Email Utility
 * 
 * Provides functions for sending emails using Nodemailer
 */

const nodemailer = require('nodemailer');
const { createLogger } = require('./logger');

const logger = createLogger('email-service');

/**
 * Create a Nodemailer transporter
 * @returns {object} - Configured Nodemailer transporter
 */
const createTransporter = () => {
  // Create a transporter using SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production' // Reject unauthorized TLS/SSL certificates in production
    }
  });
  
  return transporter;
};

/**
 * Send an email
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body
 * @param {string} options.html - HTML email body
 * @param {string} options.from - Sender email address (optional, uses default if not provided)
 * @param {Array} options.attachments - Email attachments (optional)
 * @returns {Promise} - Promise that resolves with the send info
 */
exports.sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    // Set default from address if not provided
    const from = options.from || `"MailSuite" <${process.env.FROM_EMAIL}>`;
    
    // Send email
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || []
    });
    
    logger.info(`Email sent: ${info.messageId}`, {
      to: options.to,
      subject: options.subject
    });
    
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send a welcome email to a new user
 * @param {object} user - User object
 * @param {string} user.email - User's email address
 * @param {string} user.name - User's name
 * @returns {Promise} - Promise that resolves with the send info
 */
exports.sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to MailSuite!';
  const text = `Hi ${user.name},\n\nWelcome to MailSuite! We're excited to have you on board.\n\nGet started by installing our Chrome extension and connecting your Gmail account.\n\nBest regards,\nThe MailSuite Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to MailSuite!</h2>
      <p>Hi ${user.name},</p>
      <p>Welcome to MailSuite! We're excited to have you on board.</p>
      <p>Get started by installing our Chrome extension and connecting your Gmail account.</p>
      <div style="margin: 30px 0;">
        <a href="https://chrome.google.com/webstore/detail/mailsuite/your-extension-id" 
           style="background-color: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Install Chrome Extension
        </a>
      </div>
      <p>Best regards,<br>The MailSuite Team</p>
    </div>
  `;
  
  return await exports.sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};

/**
 * Send a verification email
 * @param {object} user - User object
 * @param {string} user.email - User's email address
 * @param {string} user.name - User's name
 * @param {string} verificationToken - Email verification token
 * @returns {Promise} - Promise that resolves with the send info
 */
exports.sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  const subject = 'Verify Your Email Address';
  const text = `Hi ${user.name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe MailSuite Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email Address</h2>
      <p>Hi ${user.name},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <div style="margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Verify Email
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>Best regards,<br>The MailSuite Team</p>
    </div>
  `;
  
  return await exports.sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};

/**
 * Send a password reset email
 * @param {object} user - User object
 * @param {string} user.email - User's email address
 * @param {string} user.name - User's name
 * @param {string} resetToken - Password reset token
 * @returns {Promise} - Promise that resolves with the send info
 */
exports.sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const subject = 'Reset Your Password';
  const text = `Hi ${user.name},\n\nYou requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe MailSuite Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Please click the button below to reset your password:</p>
      <div style="margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">${resetUrl}</p>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>The MailSuite Team</p>
    </div>
  `;
  
  return await exports.sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};
