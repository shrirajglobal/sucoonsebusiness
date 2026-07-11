import LegalPage from '@/components/legal/LegalPage';

export default function ContactUs() {
  return (
    <LegalPage title="Contact Us" lastUpdated="11 July 2026">
      <p>We'd love to hear from you. Please use the appropriate channel below so your query reaches the right person.</p>

      <h2>Customer Support</h2>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a></li>
        <li><strong>Business hours:</strong> Monday–Friday, 10:00–18:00 IST (excluding public holidays)</li>
        <li><strong>Typical response time:</strong> within 2 business days</li>
      </ul>

      <h2>Business Address</h2>
      <p>
        <strong>[Proprietor legal name]</strong> (Sole Proprietorship)<br />
        [Registered address, Line 1]<br />
        [City] — [PIN code], [State], India
      </p>
      <p><strong>GSTIN:</strong> [GSTIN — if registered] · <strong>Trading as:</strong> Disha</p>

      <h2>Grievance Officer</h2>
      <p>In accordance with the Information Technology Rules, 2011 and 2021:</p>
      <ul>
        <li><strong>Name:</strong> [Grievance Officer name — proprietor]</li>
        <li><strong>Email:</strong> <a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a></li>
        <li><strong>Address:</strong> Same as business address above</li>
      </ul>
      <p>Grievances are acknowledged within 24 hours and resolved within 15 days of receipt.</p>

      <h2>Billing & Refund Queries</h2>
      <p>Please review our <a href="/refund">Cancellation & Refund Policy</a> before writing in. Include your registered email and the Razorpay transaction ID for a faster response.</p>

      <h2>Media, Partnerships & Affiliates</h2>
      <p>Use the same email above with a subject line prefix of <em>Partnership:</em>, <em>Press:</em>, or <em>Affiliate:</em>.</p>
    </LegalPage>
  );
}
