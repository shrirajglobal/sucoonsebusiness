import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import suveeLogo from '@/assets/suvee-logo.png';

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={suveeLogo} alt="Suvee" className="h-7 w-auto" />
            <span className="text-sm font-semibold">Suvee</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>
        <div className="prose prose-neutral max-w-none text-[15px] leading-relaxed
          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-foreground
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-foreground
          [&_p]:mb-4 [&_p]:text-foreground/90
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ul]:text-foreground/90
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1.5 [&_ol]:text-foreground/90
          [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80
          [&_strong]:text-foreground">
          {children}
        </div>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/refund" className="hover:text-foreground">Refund & Cancellation</Link>
          <Link to="/shipping" className="hover:text-foreground">Shipping & Delivery</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <span className="ml-auto">© {new Date().getFullYear()} Suvee</span>
        </div>
      </footer>
    </div>
  );
}
