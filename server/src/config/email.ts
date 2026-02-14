import { Resend } from 'resend';
import { env } from './env';

let resend: Resend | null = null;

if (env.RESEND_API_KEY) {
    resend = new Resend(env.RESEND_API_KEY);
}

export async function sendEmail(params: {
    to: string;
    subject: string;
    html: string;
}): Promise<boolean> {
    if (!resend) {
        console.warn('⚠️ Email service not configured (RESEND_API_KEY missing). Skipping email.');
        console.log(`📧 Would have sent email to ${params.to}: ${params.subject}`);
        return false;
    }

    try {
        await resend.emails.send({
            from: env.FROM_EMAIL,
            to: params.to,
            subject: params.subject,
            html: params.html,
        });
        return true;
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        return false;
    }
}
