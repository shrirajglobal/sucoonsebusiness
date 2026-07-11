import LegalPage from '@/components/legal/LegalPage';
import { PRICING_TIERS, formatPrice, TRIAL_DAYS, userLimitLabel } from '@/lib/pricing';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Pricing() {
  return (
    <LegalPage title="Pricing" lastUpdated="11 July 2026">
      <p>Simple, per-business pricing in Indian Rupees. All paid plans are billed monthly and are <strong>exclusive of 18% GST</strong>. Payments are processed securely by Razorpay.</p>

      <div className="not-prose grid md:grid-cols-3 gap-4 my-6">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`rounded-xl border-2 p-5 flex flex-col ${
              tier.popular ? 'border-primary bg-accent/40' : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              {tier.popular && <span className="text-[10px] uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>}
            </div>
            <p className="text-xs text-muted-foreground mb-4">{tier.tagline}</p>
            <div className="mb-3">
              <span className="text-3xl font-bold">
                {tier.monthlyPrice === 0 ? 'Free' : formatPrice(tier.monthlyPrice)}
              </span>
              {tier.monthlyPrice > 0 && <span className="text-sm text-muted-foreground"> /month + GST</span>}
            </div>
            <p className="text-xs text-muted-foreground mb-4">{userLimitLabel(tier.userLimit)}</p>
            <ul className="space-y-2 mb-5 text-sm">
              {tier.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className={`mt-auto text-sm font-medium rounded-md px-3 py-2 text-center ${
                tier.popular
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-border hover:bg-accent'
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      <h2>What's Included</h2>
      <ul>
        <li><strong>Starter (Free)</strong> — for solo founders getting organised. Tasks, Ideas, Contacts, and 20 card scans / month.</li>
        <li><strong>Growth (₹999 / month + GST)</strong> — CRM & Sales Pipeline, unlimited card scanner, Support Centre, Team & Roles, up to 10 users.</li>
        <li><strong>Scale ({formatPrice(PRICING_TIERS[2].monthlyPrice)} / month + GST)</strong> — everything in Growth plus Finance & GST, Inventory, Attendance & Compliance, AI Assistant, and multi-branch, with unlimited users.</li>
      </ul>

      <h2>Free Trial</h2>
      <p>Every new account gets a <strong>{TRIAL_DAYS}-day free trial of Growth</strong>. No payment method required. If you don't upgrade before the trial ends, your account continues on the free Starter tier — no interruption, no auto-charge.</p>

      <h2>Frequently Asked Questions</h2>

      <h3>How is billing done?</h3>
      <p>Paid plans are billed monthly on the date of your first upgrade. Renewals are charged automatically to the payment method on file via Razorpay.</p>

      <h3>Do you issue GST invoices?</h3>
      <p>Yes. Every paid invoice is GST-compliant and is emailed to your registered address. Add your GSTIN in <em>Settings → Business</em> to have it printed on future invoices.</p>

      <h3>Can I cancel any time?</h3>
      <p>Yes. Cancel from <em>Settings → Billing</em>. Cancellation stops the next renewal; you keep access until the end of the current period.</p>

      <h3>Are subscriptions refundable?</h3>
      <p><strong>No.</strong> All payments are final. See our <Link to="/refund">Cancellation & Refund Policy</Link> for details.</p>

      <h3>What payment methods are accepted?</h3>
      <p>All major Indian credit/debit cards, UPI, and net banking, through Razorpay.</p>

      <h3>Do you offer discounts for annual billing or NGOs?</h3>
      <p>Write to <a href="mailto:shrirajglobal@gmail.com">shrirajglobal@gmail.com</a> — we consider annual-prepay and non-profit discounts on a case-by-case basis.</p>
    </LegalPage>
  );
}
