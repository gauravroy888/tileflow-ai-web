import React from 'react';
import { X, FileSpreadsheet, FolderArchive, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface CsvImportTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onDownloadTemplate: () => void;
}

export const CsvImportTutorialModal: React.FC<CsvImportTutorialModalProps> = ({ isOpen, onClose, onProceed }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
          <h2 className="text-lg font-bold text-textPrimary">How do you want to upload?</h2>
          <button onClick={onClose} className="p-2 bg-surface hover:bg-surfaceHover rounded-full transition-colors">
            <X size={20} className="text-textSecondary" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto bg-background">
          <p className="text-textSecondary text-sm">
            You can add thousands of products at once! Choose the option that best fits your situation:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Option A */}
            <div className="border border-border rounded-xl p-5 bg-surface flex flex-col h-full hover:border-primary/50 transition-colors cursor-pointer" onClick={onProceed}>
              <div className="flex items-center gap-3 mb-3 text-primary">
                <FileSpreadsheet size={28} />
                <h3 className="font-bold text-textPrimary text-base">Spreadsheet Only</h3>
              </div>
              <img src="/csv_upload.png" alt="Spreadsheet containing image_url column" className="w-full h-32 object-cover rounded-lg border border-border mb-3" />
              <p className="text-xs text-textSecondary font-medium mb-1">
                Upload a standard .csv file.
              </p>
              <p className="text-xs text-textSecondary flex-1">
                Best if you don't have product images, or if your images are already hosted online (just include the web links in your spreadsheet).
              </p>
            </div>

            {/* Option B */}
            <div className="border border-border rounded-xl p-5 bg-surface flex flex-col h-full hover:border-primary/50 transition-colors cursor-pointer" onClick={onProceed}>
              <div className="flex items-center gap-3 mb-3 text-primary">
                <FolderArchive size={28} />
                <h3 className="font-bold text-textPrimary text-base">Spreadsheet + Images</h3>
              </div>
              <img src="/zip_upload.png" alt="ZIP folder containing CSV and images" className="w-full h-40 object-cover rounded-lg border border-border mb-3" />
              <p className="text-xs text-textSecondary font-medium mb-1">
                Upload a .zip folder.
              </p>
              <p className="text-xs text-textSecondary flex-1">
                Best if you have a folder of photos saved directly on your computer. Just zip your spreadsheet and photos together!
              </p>
            </div>
          </div>


        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3 sticky bottom-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onProceed} className="gap-2">
            Select File
            <ArrowRight size={16} />
          </Button>
        </div>

      </div>
    </div>
  );
};
