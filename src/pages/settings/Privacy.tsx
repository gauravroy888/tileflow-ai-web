import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Database, Lock, ShieldCheck, Sparkles, ShieldAlert } from 'lucide-react';
import { useRetailProfile } from '../../components/providers/RetailProfileProvider';

const Privacy = () => {
  const navigate = useNavigate();
  const { shop } = useRetailProfile();

  const shopType = shop?.retail_profile_id || 'default';

  const getDynamicContent = () => {
    switch (shopType) {
      case 'jewelry':
        return 'Customer design preferences, ring sizes, and purchase history of precious items are strictly confidential.';
      case 'hardware_tiles':
        return 'Customer floor plans, project dimensions, and building layouts are securely stored.';
      case 'electronics':
        return 'Customer warranty data, device serial numbers, and service history are encrypted.';
      case 'furniture':
        return 'Customer room dimensions and delivery addresses are kept secure.';
      default:
        return 'All your customer data, purchase history, and store inventory are safely encrypted.';
    }
  };

  return (
    <div className="page-shell mx-auto max-w-screen-xl">
      <header className="mb-6">
        <button onClick={() => navigate('/more')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-textSecondary transition-colors hover:text-primary">
          <ChevronLeft size={16} /> Back to More
        </button>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Privacy & data</h2>
          <p className="mt-1 text-sm text-textSecondary">How we protect your workspace data.</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Lock size={22} />
          </div>
          <h3 className="text-lg font-extrabold text-textPrimary">Data Security</h3>
          <p className="mt-2 text-sm leading-relaxed text-textSecondary">
            {getDynamicContent()} We use enterprise-grade encryption for all data at rest and in transit.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles size={22} />
          </div>
          <h3 className="text-lg font-extrabold text-textPrimary">AI Processing</h3>
          <p className="mt-2 text-sm leading-relaxed text-textSecondary">
            RetailFlow's AI uses your catalogue strictly to assist your showroom. Your private product margins and customer contact details are never used to train global AI models.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm md:col-span-2">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
            <ShieldAlert size={22} />
          </div>
          <h3 className="text-lg font-extrabold text-textPrimary">Usage Limits & API Protection</h3>
          <p className="mt-2 text-sm leading-relaxed text-textSecondary mb-4">
            To protect against spam and ensure high performance for all workspaces, the following fair-use limits are enforced automatically:
          </p>
          <ul className="space-y-2 text-sm text-textSecondary list-disc pl-5">
            <li><strong className="text-textPrimary">AI Images:</strong> 50 per user per day.</li>
            <li><strong className="text-textPrimary">AI Chats:</strong> 100 messages per user per day. (Help Center remains untouched and limitless as requested).</li>
            <li><strong className="text-textPrimary">Quotes:</strong> 100 quotes per user per day.</li>
            <li><strong className="text-textPrimary">Products:</strong> 100 products per user per hour, and 5,000 total products per workspace.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm md:col-span-2">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <ShieldCheck size={22} />
          </div>
          <h3 className="text-lg font-extrabold text-textPrimary">Your Data Ownership</h3>
          <p className="mt-2 text-sm leading-relaxed text-textSecondary">
            You own 100% of the data you bring into RetailFlow. You can request a full export of your customers and products at any time. We comply with modern privacy standards and never sell your data to third parties.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-sand p-4">
            <Database size={18} className="text-stone" />
            <span className="text-sm font-bold text-textPrimary">Data export available upon request to support.</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
