import React, { useState, useRef } from 'react';
import { Button } from '../components/Button';
import { ArrowLeft, Sparkles, Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InputViewProps {
  onBack: () => void;
  onSubmit: (idea: string, attachment?: { mimeType: string, data: string }, preferredModel?: string) => void;
  credits?: number;
  isLifetime?: boolean;
}

export const InputView: React.FC<InputViewProps> = ({ onBack, onSubmit, credits, isLifetime }) => {
  const [idea, setIdea] = useState('');
  const [preferredModel, setPreferredModel] = useState('auto');
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation Constants
  const MIN_TEXT_LENGTH = 10;
  const textLength = idea.trim().length;
  const hasSufficientText = textLength >= MIN_TEXT_LENGTH;
  const hasAttachment = attachment !== null;
  const canSubmit = hasSufficientText || hasAttachment;

  const handleSubmit = () => {
    if (canSubmit) {
      // Check for insufficient credits
      if (!isLifetime && credits !== undefined && credits <= 0) {
        setError("No credits remaining. Please upgrade to continue analyzing ideas.");
        return;
      }
      
      onSubmit(
        idea.trim() || "Idea from attachment", 
        attachment ? { mimeType: attachment.mimeType, data: attachment.data } : undefined,
        preferredModel
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);

    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        if (file.size > 5 * 1024 * 1024) {
            setError("File is too large. Max size is 5MB due to API limits.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            
            setAttachment({
                name: file.name,
                mimeType: file.type,
                data: base64Data
            });
        };
        reader.onerror = () => {
            setError("Failed to read file.");
        };
        reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
      setAttachment(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  };

  return (
    <div className="max-w-2xl mx-auto w-full pt-8 px-4">
      <button 
        onClick={onBack} 
        className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} className="mr-2" /> Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Pitch your idea</h2>
            <p className="text-slate-500">Describe your product or upload a pitch deck or document.</p>
          </div>
          {credits !== undefined && (
            <div className="text-right">
              <p className="text-sm text-slate-500">Credits</p>
              <p className={`font-semibold text-lg ${!isLifetime && credits <= 1 ? 'text-rose-600' : 'text-slate-900'}`}>
                {isLifetime ? '∞' : credits}
              </p>
              {!isLifetime && credits <= 1 && (
                <p className="text-xs text-rose-500 mt-1">Low credits - upgrade soon!</p>
              )}
            </div>
          )}
        </div>

        {/* Text Area */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <select 
              value={preferredModel}
              onChange={(e) => setPreferredModel(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-600 cursor-pointer"
            >
              <option value="auto">Auto (Best available)</option>
              <option value="gemini">Google Gemini 1.5 Flash</option>
            </select>
          </div>
          <textarea 
            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none text-slate-800 placeholder:text-slate-400 text-lg leading-relaxed"
            placeholder="e.g. A marketplace for freelance chefs to cook weekly meals in people's homes..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
        </div>

        {/* Attachments Section */}
        <div className="space-y-4">
             <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.txt,.md,.csv,.doc,.docx,.rtf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
             />
             
             {/* Document Upload State */}
             {attachment && (
                 <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                     <div className="flex items-center gap-3 overflow-hidden">
                         <div className="p-2 bg-white rounded-md text-blue-600 shrink-0">
                             <FileText size={20} />
                         </div>
                         <div className="min-w-0">
                             <p className="text-sm font-medium text-slate-900 truncate">{attachment.name}</p>
                             <p className="text-xs text-slate-500">Document attached</p>
                         </div>
                     </div>
                     <button onClick={removeFile} className="p-2 hover:bg-blue-100 rounded-full text-slate-500 hover:text-rose-500 transition-colors">
                         <X size={18} />
                     </button>
                 </div>
             )}

             {/* Default Upload Button */}
             {!attachment && (
                 <div className="grid grid-cols-1">
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all font-medium text-sm"
                     >
                        <Upload size={24} /> 
                        <span>Upload File (PDF, DOCX, TXT, Images)</span>
                     </button>
                 </div>
             )}
        </div>

        {error && (
            <div className="flex items-center gap-2 text-rose-600 text-sm mb-4 bg-rose-50 p-3 rounded-lg mt-4">
                <AlertCircle size={16} /> {error}
            </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-6 border-t border-slate-100 gap-4">
          <div className="flex items-center gap-2">
            {!canSubmit ? (
               <div className="text-slate-400 text-sm flex items-center gap-2 animate-fade-in transition-all">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  {textLength > 0 ? (
                      <span>{MIN_TEXT_LENGTH - textLength} more characters needed</span>
                  ) : (
                      <span>Enter description or upload file</span>
                  )}
               </div>
            ) : (
               <div className="text-emerald-600 text-sm font-medium flex items-center gap-2 animate-fade-in transition-all">
                  <CheckCircle2 size={16} />
                  <span>Ready to analyze</span>
               </div>
            )}
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit}
            className="gap-2 w-full sm:w-auto"
          >
            <Sparkles size={18} /> Analyze Idea
          </Button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-400">
          AI analyzes text and document patterns. <br/>Results are for guidance only.
        </p>
      </div>
    </div>
  );
};