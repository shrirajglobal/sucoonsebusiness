import LegalPage from '@/components/legal/LegalPage';

export default function Shipping() {
  return (
    <LegalPage title="Shipping & Delivery Policy" lastUpdated="11 July 2026">
      <h2>1. Nature of the Service</h2>
      <p>
        <strong>Disha</strong> is a digital software-as-a-service (SaaS) platform. There are no physical goods sold, and
        no physical shipment or courier is involved with any purchase.
      </p>

      <h2>2. How Access is Delivered</h2>
      <ul>
        <li>Access to paid features is provisioned <strong>automatically within a few minutes</strong> of a successful payment confirmation received from Razorpay.</li>
        <li>The upgrade reflects immediately when you refresh the app or navigate to any paid module.</li>
        <li>A GST-compliant invoice for the transaction is emailed to your registered email address.</li>
      </ul>

      <h2>3. If Access Isn't Provisioned</h2>
      <p>If your plan has not upgraded within 30 minutes of successful payment, email <a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a> with your registered email and the Razorpay transaction ID. We aim to respond within <strong>2 business days</strong> (Monday–Friday, 10:00–18:00 IST, excluding public holidays).</p>

      <h2>4. Geographic Availability</h2>
      <p>Disha is offered to businesses in India. Pricing is displayed in Indian Rupees (₹) and is exclusive of 18% GST.</p>

      <h2>5. Contact</h2>
      <p><a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a></p>
    </LegalPage>
  );
}
