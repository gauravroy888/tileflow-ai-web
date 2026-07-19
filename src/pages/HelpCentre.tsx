import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, HelpCircle, LifeBuoy, MessageSquare } from 'lucide-react';
import { useRetailProfile } from '../components/providers/RetailProfileProvider';

const HelpCentre = () => {
  const navigate = useNavigate();
  const { shop } = useRetailProfile();

  const shopType = shop?.retail_profile_id || 'default';

  // Dynamic FAQs based on shop type
  const getFaqs = () => {
    const commonFaqs = [
      { q: "How do I add a new team member?", a: "Go to Workspace Settings > More > Team access to invite new sales executives." },
      { q: "Can I use RetailFlow AI on my phone?", a: "Yes! RetailFlow is fully responsive and designed to be used by sales reps right on the showroom floor." }
    ];

    switch (shopType) {
      case 'jewelry':
        return [
          { q: "How do I track custom ring design orders?", a: "Use the 'Quotes' tool to build a custom quotation and add design notes to the Customer Profile." },
          { q: "How can AI help sell jewelry?", a: "Ask the AI assistant for recommendations based on a customer's specific occasion (e.g. 'Show me gifts for a 10th anniversary')." },
          ...commonFaqs
        ];
      case 'hardware_tiles':
        return [
          { q: "How do I track tile batches and square footage?", a: "When adding a product, use the Attributes section to specify Sq Ft per box and batch numbers." },
          { q: "How do I generate a bulk quotation for a contractor?", a: "Head to the 'Quotes' tab, select the contractor from your Customers, and add products in bulk." },
          ...commonFaqs
        ];
      case 'electronics':
        return [
          { q: "How do I log serial numbers?", a: "Add serial numbers as a custom attribute when generating a final sale or quotation." },
          { q: "Does the AI know tech specs?", a: "Yes, if you've entered tech specs in the product description, the AI can compare two electronics for a customer instantly." },
          ...commonFaqs
        ];
      default:
        return [
          { q: "How do I upload multiple images for a product?", a: "When creating or editing a product, you can tap the upload area to add up to 3 images for a rich catalog display." },
          ...commonFaqs
        ];
    }
  };

  const faqs = getFaqs();

  return (
    <div className="page-shell mx-auto max-w-screen-xl space-y-6">
      <header>
        <button onClick={() => navigate('/more')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-textSecondary transition-colors hover:text-primary">
          <ChevronLeft size={16} /> Back to More
        </button>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Help centre</h2>
          <p className="mt-1 text-sm text-textSecondary">Learn how to make the most of RetailFlow.</p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <button className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-textPrimary">Read the Guides</h3>
              <p className="mt-0.5 text-xs text-textSecondary">Step-by-step tutorials</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-stone" />
        </button>
        <button className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-textPrimary">Contact Support</h3>
              <p className="mt-0.5 text-xs text-textSecondary">Get help from our team</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-stone" />
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand text-primary">
            <HelpCircle size={20} />
          </div>
          <h3 className="text-lg font-extrabold text-textPrimary">Frequently Asked Questions</h3>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className={`pb-4 ${index < faqs.length - 1 ? 'border-b border-border' : ''}`}>
              <h4 className="font-bold text-textPrimary">{faq.q}</h4>
              <p className="mt-2 text-sm leading-relaxed text-textSecondary">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
      
      <section className="flex items-center gap-4 rounded-2xl border border-warning/20 bg-warning/5 p-5">
        <LifeBuoy size={24} className="text-warning shrink-0" />
        <p className="text-sm font-bold text-warning">
          Need immediate assistance during a sale? Try asking the AI Assistant on the AI Studio tab for quick inventory lookups.
        </p>
      </section>
    </div>
  );
};

export default HelpCentre;
