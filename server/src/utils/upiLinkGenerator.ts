export interface UPIPaymentIntent {
    payeeVPA: string;
    payeeName: string;
    amount: number;
    transactionNote: string;
}

/**
 * Generates a UPI deep link following the NPCI standard.
 * 
 * Format: upi://pay?pa={vpa}&pn={name}&am={amount}&tn={note}&cu=INR
 * 
 * This link opens the user's default UPI app (GPay, PhonePe, Paytm, etc.)
 * on mobile devices when clicked.
 */
export function generateUPILink(intent: UPIPaymentIntent): string {
    const params = new URLSearchParams({
        pa: intent.payeeVPA,
        pn: intent.payeeName,
        am: intent.amount.toFixed(2),
        tn: intent.transactionNote,
        cu: 'INR',
    });
    return `upi://pay?${params.toString()}`;
}
