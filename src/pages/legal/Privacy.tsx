import LegalPage from '@/components/legal/LegalPage';

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="11 July 2026">
      <p>
        This Privacy Policy explains how <strong>Suvee Business Automation</strong>, operated by <strong>[Proprietor legal name]</strong>
        ("we", "us"), collects, uses, and shares information when you use our website and application. This policy is
        published in accordance with Rule 3(1) of the Information Technology (Intermediaries Guidelines and Digital Media
        Ethics Code) Rules, 2021 and the Information Technology (Reasonable Security Practices and Procedures and
        Sensitive Personal Data or Information) Rules, 2011, and takes into account the Digital Personal Data Protection
        Act, 2023.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address, phone number, business name, city.</li>
        <li><strong>Business data you enter:</strong> tasks, leads, contacts, forms, attendance, invoices, and other records you create in Suvee.</li>
        <li><strong>Payment metadata:</strong> subscription tier, invoice history, and transaction IDs. Full card numbers, CVV, and net-banking credentials are entered directly on Razorpay's secure environment and never touch our servers.</li>
        <li><strong>Usage data:</strong> pages visited, actions taken, device type, IP address, and browser type — used to keep the service secure and reliable.</li>
        <li><strong>Cookies:</strong> essential cookies for login sessions. We do not use advertising cookies.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide, maintain, and improve the service.</li>
        <li>To authenticate you and secure your account.</li>
        <li>To process payments and issue invoices.</li>
        <li>To send transactional and service notifications (e.g. billing, security, plan changes).</li>
        <li>To respond to support and grievance requests.</li>
        <li>To comply with legal obligations under Indian law.</li>
      </ul>

      <h2>3. Sharing of Information</h2>
      <p>We share information only with the following categories of processors, and only to the extent needed to run the service:</p>
      <ul>
        <li><strong>Razorpay</strong> — to process payments.</li>
        <li><strong>Lovable Cloud</strong> — hosting, database, authentication, and file storage.</li>
        <li><strong>AI providers</strong> — only when you use an AI feature (card scanner, weekly report, assistant, partner search). Only the input needed for that feature is sent; the providers do not train on your data.</li>
        <li><strong>Government / law-enforcement</strong> — where required by a valid legal order.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>4. Data Retention</h2>
      <p>We retain your account data for as long as your account is active. If you delete your account, we retain the data for up to <strong>90 days</strong> to allow for accidental restoration, after which it is permanently deleted, unless a longer retention period is required by law (for example, tax records under the Income Tax Act, 1961).</p>

      <h2>5. Data Security</h2>
      <p>We follow reasonable security practices commensurate with the sensitivity of the information handled, including:</p>
      <ul>
        <li>HTTPS/TLS in transit for all traffic to the app.</li>
        <li>Authenticated access to data with row-level access controls in the database.</li>
        <li>Access to production systems is restricted to authorised personnel only.</li>
        <li>Payment card data is handled entirely by Razorpay under their PCI-DSS environment.</li>
      </ul>
      <p>No system is 100% secure. If you believe your account has been compromised, contact us immediately.</p>

      <h2>6. Your Rights</h2>
      <p>Subject to applicable law, you may:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate or outdated information.</li>
        <li>Request deletion of your account and associated personal data.</li>
        <li>Withdraw consent for optional processing.</li>
        <li>Lodge a grievance with our Grievance Officer (see Section 9).</li>
      </ul>
      <p>To exercise any of these rights, email <a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a> from the address associated with your account.</p>

      <h2>7. Children</h2>
      <p>Suvee is a B2B service intended for adults. We do not knowingly collect information from anyone under 18.</p>

      <h2>8. International Transfers</h2>
      <p>Some of our processors (e.g. AI providers) may store or process data on servers located outside India. Where this happens, we rely on contractual safeguards with those providers.</p>

      <h2>9. Grievance Officer</h2>
      <p>In accordance with Rule 5(9) of the SPDI Rules, 2011 and Rule 3(2) of the IT Rules, 2021:</p>
      <ul>
        <li><strong>Name:</strong> [Grievance Officer name — proprietor]</li>
        <li><strong>Email:</strong> <a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a></li>
        <li><strong>Address:</strong> [Registered address, PIN code], India</li>
      </ul>
      <p>We will acknowledge grievances within <strong>24 hours</strong> and resolve them within <strong>15 days</strong> of receipt.</p>

      <h2>10. Changes to this Policy</h2>
      <p>We may update this Privacy Policy from time to time. Material changes will be notified by email or in-app notice. The "Last updated" date at the top reflects the current version.</p>

      <h2>11. Contact</h2>
      <p>For any privacy-related question, email <a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a>.</p>
    </LegalPage>
  );
}
