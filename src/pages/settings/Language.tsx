import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Globe } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const Language = () => {
  const navigate = useNavigate();
  // Using local state for preference (could be tied to profile later)
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const [saving, setSaving] = useState(false);

  const languages = [
    { id: 'en', name: 'English', native: 'English' },
    { id: 'hi', name: 'Hindi', native: 'हिन्दी' },
  ];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      navigate('/more');
    }, 600);
  };

  return (
    <div className="page-shell mx-auto max-w-screen-xl">
      <header className="mb-6">
        <button onClick={() => navigate('/more')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-textSecondary transition-colors hover:text-primary">
          <ChevronLeft size={16} /> Back to More
        </button>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Language</h2>
          <p className="mt-1 text-sm text-textSecondary">Choose your display language preference.</p>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {languages.map((lang, index) => (
          <button
            key={lang.id}
            onClick={() => setSelectedLanguage(lang.id as 'en' | 'hi')}
            className={`flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-sand/50 ${index > 0 ? 'border-t border-border' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${selectedLanguage === lang.id ? 'bg-primary text-background' : 'bg-sand text-primary'}`}>
                <Globe size={20} />
              </div>
              <div>
                <p className="font-extrabold text-textPrimary">{lang.name}</p>
                <p className="text-sm text-textSecondary">{lang.native}</p>
              </div>
            </div>
            {selectedLanguage === lang.id && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-background">
                <Check size={14} />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-32 py-3">
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};

export default Language;
