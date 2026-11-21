import * as nodemailer from "nodemailer";
/**
 * @description A function that sends a email to the specified addresses (can not be replied)
 * must has the following envs in your application: HOST_OFFICE, USERNAME_NO_REPLY and PASSWORD_NO_REPLY
 * @param {Array} emails - Array of email addresses
 * @param {string} subject - Subject of the email
 * @param {string} html  - Text of the email
 * @returns  returns a message from transporter nodemailer or null if has error
 */
export declare const sendEmailOffice365NoReply: (emails: string[], subject: string, html: string) => Promise<nodemailer.SMTPSentMessageInfo>;
