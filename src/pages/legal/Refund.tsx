import LegalPage from '@/components/legal/LegalPage';

export default function Refund() {
  return (
    <LegalPage title="Cancellation & Refund Policy" lastUpdated="11 July 2026">
      <p>
        This policy applies to all paid subscriptions purchased on <strong>Suvee</strong>, operated by
        <strong> [Proprietor legal name]</strong>. Please read it carefully before making a payment.
      </p>

      <h2>1. No Refunds</h2>
      <p>
        <strong>All payments made to Suvee are final and non-refundable.</strong> Once a payment is captured by our
        payment processor (Razorpay), the corresponding subscription period is deemed consumed for the purpose of this
        policy, and no refund — whole or partial — will be issued.
      </p>

      <h2>2. Cancellation</h2>
      <ul>
        <li>Subscriptions renew automatically on the billing date until cancelled.</li>
        <li>You can cancel any time from <strong>Settings → Billing</strong> inside the app.</li>
        <li>Cancellation stops the <strong>next</strong> renewal. You keep access to the paid features until the end of the current billing period.</li>
        <li>There is no pro-rata refund for the unused portion of a billing period.</li>
      </ul>

      <h2>3. Free Trial</h2>
      <p>New accounts get a 90-day trial of the Growth tier. No payment method is required for the trial, so there is nothing to refund. If you do not upgrade before the trial ends, your account moves to the free Starter tier automatically.</p>

      <h2>4. Account Termination for Breach</h2>
      <p>If your account is suspended or terminated for a breach of our <a href="/terms">Terms & Conditions</a>, no refund will be issued for the remaining period.</p>

      <h2>5. Duplicate or Erroneous Charges</h2>
      <p>If Razorpay has captured a duplicate transaction, or has captured a charge for a failed transaction that was never provisioned to your account, we will reverse it. Write to <a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a> from your registered email within 30 days of the transaction with the transaction ID. Verified reversals are processed via Razorpay within 7–10 business days to the original payment method.</p>

      <h2>6. Chargebacks</h2>
      <p>If you initiate a chargeback with your bank instead of contacting us first, we reserve the right to suspend your account pending resolution.</p>

      <h2>7. Contact</h2>
      <p>Billing questions: <a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a>.</p>
    </LegalPage>
  );
}
