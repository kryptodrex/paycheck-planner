import { loadLocalEnvForElectron } from './utils/loadEnv';

loadLocalEnvForElectron();

// Set this to your Google Form view URL, for example:
// https://docs.google.com/forms/d/e/<FORM_ID>/viewform
export const FEEDBACK_FORM_URL = process.env.FEEDBACK_FORM_URL || '';

// Optional prefill entry IDs from your Google Form.
// Leave blank to open the form without prefilled values.
export const FEEDBACK_FORM_ENTRY_IDS = {
	email: process.env.FEEDBACK_FORM_ENTRY_EMAIL || '',
	category: process.env.FEEDBACK_FORM_ENTRY_CATEGORY || '',
	subject: process.env.FEEDBACK_FORM_ENTRY_SUBJECT || '',
	details: process.env.FEEDBACK_FORM_ENTRY_DETAILS || '',
};

