import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ArrowLeft, Key, Eye, EyeOff, Save, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface CustomApiKeysProps {
  onBack: () => void;
  user: any;
  onUpdateProfile: (data: any) => void;
}

export const CustomApiKeysView: React.FC<CustomApiKeysProps> = ({ onBack, user, onUpdateProfile }) => {
  const [apiKeys, setApiKeys] = useState({
    gemini: (user.preferences?.customApiKeys?.gemini) || ''
  });
  
  const [showKeys, setShowKeys] = useState({
    gemini: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      await onUpdateProfile({
        preferences: {
          ...user.preferences,
          customApiKeys: {
            gemini: apiKeys.gemini.trim() || undefined
          }
        }
      });
      
      setMessage({ type: 'success', text: 'API keys saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to save API keys. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = (provider: 'gemini') => {
    setApiKeys(prev => ({ ...prev, [provider]: '' }));
  };

  const toggleKeyVisibility = (provider: 'gemini') => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getProviderInfo = (provider: string) => {
    switch (provider) {
      case 'gemini':
        return {
          name: 'Google Gemini',
          description: 'Primary AI provider with attachment support',
          placeholder: 'AIzaSy...',
          url: 'https://aistudio.google.com/app/apikey',
          icon: '🤖'
        };
      default:
        return { name: provider, description: '', placeholder: '', url: '', icon: '🔑' };
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full pt-8 px-4">
      <button 
        onClick={onBack} 
        className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} className="mr-2" /> Back to Settings
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Key size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Custom API Keys</h2>
            <p className="text-slate-500">Add your own AI provider API keys for better reliability</p>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(apiKeys).map(([provider, key]) => {
            const info = getProviderInfo(provider);
            const isVisible = showKeys[provider as keyof typeof showKeys];
            
            return (
              <Card key={provider} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{info.name}</h3>
                      <p className="text-sm text-slate-500">{info.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleKeyVisibility(provider as keyof typeof showKeys)}
                      className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
                      title={isVisible ? 'Hide key' : 'Show key'}
                    >
                      {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {key && (
                      <button
                        onClick={() => handleClear(provider as keyof typeof apiKeys)}
                        className="p-2 text-rose-500 hover:text-rose-700 transition-colors"
                        title="Clear key"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    value={key}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                    placeholder={info.placeholder}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                  />
                  
                  <div className="flex items-center justify-between">
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Get API Key →
                    </a>
                    
                    {key && (
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle size={12} />
                        <span>Configured</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 gap-2"
          >
            <Save size={16} />
            {isLoading ? 'Saving...' : 'Save API Keys'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={onBack}
            className="gap-2"
          >
            Cancel
          </Button>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">🔒 Security Notice</p>
              <p>Your API keys are encrypted and stored securely. They're only used for AI requests and never shared with third parties.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
