export interface UPIPaymentIntent {
    payeeVPA: string;
    payeeName: string;
    amount: number;
    transactionNote: string;
}

// UPI VPA format: alphanumeric/dots/hyphens @ provider handle
const UPI_VPA_REGEX = /^[\w.\-]+@[a-zA-Z][a-zA-Z0-9]*$/;

/**
 * Validate UPI VPA format.
 */
export function isValidUpiVpa(vpa: string): boolean {
    return UPI_VPA_REGEX.test(vpa);
}

/**
 * Sanitize payee name for the UPI URI — remove chars that break URI encoding.
 */
function sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 50);
}

/**
 * Generates an NPCI-compliant UPI deep link.
 * 
 * Format: upi://pay?pa={vpa}&pn={name}&am={amount}&tn={note}&cu=INR
 * 
 * Important: We build the URI manually instead of using URLSearchParams
 * because URLSearchParams encodes '@' as '%40', which breaks some UPI apps
 * (Google Pay, PhonePe on certain Android versions).
 */
export function generateUPILink(intent: UPIPaymentIntent): string {
    if (!isValidUpiVpa(intent.payeeVPA)) {
        throw new Error(`Invalid UPI VPA format: "${intent.payeeVPA}". Expected format: yourname@bank`);
    }

    if (intent.amount <= 0) {
        throw new Error('UPI payment amount must be positive');
    }

    const pa = intent.payeeVPA;
    const pn = encodeURIComponent(sanitizeName(intent.payeeName));
    const am = intent.amount.toFixed(2);
    const tn = encodeURIComponent(intent.transactionNote.slice(0, 50));

    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`;
}
