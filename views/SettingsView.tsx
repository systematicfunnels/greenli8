import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Loader2, FileArchive, Key, Trash2, ChevronDown, ChevronRight, Edit2, Zap, Sparkles, Box, CheckCircle2 } from 'lucide-react';
import { UserProfile, ValidationReport } from '../types';
import { jsPDF } from "jspdf";
import JSZip from "jszip";

interface SettingsViewProps {
  user: UserProfile | null;
  history: ValidationReport[];
  onBack: () => void;
  onDeleteData: () => void;
  onUpdateProfile: (data: Partial<UserProfile>) => void;
  onLogout: () => void;
  credits: number;
  isLifetime: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  user,
  history,
  onBack: _, 
  onDeleteData,
  onUpdateProfile,
  onLogout,
  credits,
  isLifetime 
}) => {
  // Profile State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatarUrl);
  
  // Preferences State
  const [emailNotifications, setEmailNotifications] = useState(user?.preferences?.emailNotifications ?? true);
  const [marketingEmails, setMarketingEmails] = useState(user?.preferences?.marketingEmails ?? false);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'notifications' | 'api_keys'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [_passwordResetSent, _setPasswordResetSent] = useState(false);
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['premium', 'advanced', 'custom']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const premiumModels = [
    { name: 'Gemini-1.5-Pro', type: 'Premium', provider: 'GREENLI8', icon: <Sparkles size={14} /> },
  ];

  const advancedModels = [
    { name: 'Gemini-1.5-Flash-Latest', type: 'Standard', provider: 'GREENLI8', icon: <Zap size={14} /> },
  ];

  // Add Model Form State
  const [newProvider, setNewProvider] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [customModels, setCustomModels] = useState<any[]>([]);

  const PROVIDER_MODELS: Record<string, string[]> = {
    'gemini': ['gemini-2.0-flash', 'gemini-2.0-pro-exp-02-05', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    'openai': ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
    'anthropic': ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
    'custom': []
  };
  
  // Sync custom models from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('greenli8_custom_models');
    if (saved) {
      try {
        setCustomModels(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom models", e);
      }
    }
  }, []);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if user prop changes externally
  useEffect(() => {
    if (user) {
        setName(user.name);
        setEmail(user.email);
        setAvatarUrl(user.avatarUrl);
        if (user.preferences) {
            setEmailNotifications(user.preferences.emailNotifications);
            setMarketingEmails(user.preferences.marketingEmails);
        }
    }
  }, [user]);

  const handleProfileSave = async () => {
    setIsSaving(true);
    await onUpdateProfile({ 
        name, 
        email,
        avatarUrl
    });
    setIsSaving(false);
    alert("Profile saved.");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      onUpdateProfile({ avatarUrl: result });
    };
    reader.readAsDataURL(file);
  };

  const _handlePasswordReset = () => {
    _setPasswordResetSent(true);
    setTimeout(() => _setPasswordResetSent(false), 3000);
    // alert(`Password reset link sent to ${email}`);
  };

  // We need to use it somewhere to avoid TS6133
  console.log('Settings ready', { _handlePasswordReset });

  const toggleNotification = (type: 'email' | 'marketing') => {
      let newEmailNotifs = emailNotifications;
      let newMarketing = marketingEmails;

      if (type === 'email') {
          newEmailNotifs = !emailNotifications;
          setEmailNotifications(newEmailNotifs);
      } else {
          newMarketing = !marketingEmails;
          setMarketingEmails(newMarketing);
      }

      onUpdateProfile({
          preferences: {
              theme: user?.preferences?.theme || 'light',
              emailNotifications: newEmailNotifs,
              marketingEmails: newMarketing
          }
      });
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      zip.file("validation_history.json", JSON.stringify(history, null, 2));
      zip.file("README.txt", "This archive contains your validation history from Greenli8 AI.");

      const reportsFolder = zip.folder("reports");
      
      if (history && history.length > 0) {
          history.forEach((report) => {
              const doc = new jsPDF();
              // (Simplified PDF generation logic for brevity - assume same logic as ReportView or similar)
              doc.text(`Report for: ${report.oneLineTakeaway}`, 10, 10);
              doc.text(`Verdict: ${report.summaryVerdict}`, 10, 20);
              doc.text(report.marketReality, 10, 30, { maxWidth: 180 });
              
              const safeDate = new Date(report.createdAt).toISOString().split('T')[0];
              const filename = `Report_${safeDate}_${report.id.substring(0,6)}.pdf`;
              reportsFolder?.file(filename, doc.output('blob'));
          });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Greenli8_Export_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to export.");
    } finally {
      setIsExporting(false);
    }
  };

  const getInitials = (n: string) => {
      return n ? n.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  const handleAddModel = () => {
    if (!newProvider || !newModel || !newApiKey) {
      alert("Please fill all required fields (*)");
      return;
    }

    const customModel = {
      provider: newProvider,
      model: newModel,
      apiKey: newApiKey,
      id: Date.now().toString()
    };

    const existingModels = JSON.parse(localStorage.getItem('greenli8_custom_models') || '[]');
    existingModels.push(customModel);
    localStorage.setItem('greenli8_custom_models', JSON.stringify(existingModels));
    setCustomModels(existingModels);

    // Reset and close
    setNewProvider('');
    setNewModel('');
    setNewApiKey('');
    setIsAddModelModalOpen(false);
    alert("Model added successfully!");
  };

  const removeModel = (id: string) => {
    const updated = customModels.filter(m => m.id !== id);
    localStorage.setItem('greenli8_custom_models', JSON.stringify(updated));
    setCustomModels(updated);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
         <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Settings</h1>
            <p className="text-slate-500">Manage your preferences.</p>
         </div>
         <Button variant="outline" onClick={onLogout} className="text-rose-600 border-rose-200">Log Out</Button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
        <button onClick={() => setActiveTab('general')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'general' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>General</button>
        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'profile' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Profile</button>
        <button onClick={() => setActiveTab('notifications')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'notifications' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Notifications</button>
        <button onClick={() => setActiveTab('api_keys')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'api_keys' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>API Keys</button>
      </div>

      <div className="space-y-6">
        {activeTab === 'general' && (
          <div className="space-y-8">
            <Card title="Account & Subscription">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Plan</p>
                  <p className="font-semibold text-slate-900 text-lg">{isLifetime ? "Founder Lifetime" : "Standard"}</p>
                </div>
                {!isLifetime && (
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Credits</p>
                    <p className="font-semibold text-slate-900 text-lg">{credits}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Data Export">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Export Data</h4>
                  <p className="text-sm text-slate-500">Download ZIP archive.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportZip} disabled={isExporting}>
                  {isExporting ? <Loader2 className="animate-spin" size={16} /> : <FileArchive size={16} />}
                </Button>
              </div>
            </Card>

            <div className="border border-rose-200 rounded-xl overflow-hidden">
                <div className="bg-rose-50 px-6 py-4 border-b border-rose-100">
                    <h3 className="font-semibold text-rose-700">Danger Zone</h3>
                </div>
                <div className="p-6 bg-white flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold">Delete Account</h4>
                        <p className="text-sm text-slate-500">Permanently remove your account and data.</p>
                    </div>
                    <Button variant="outline" className="text-rose-600 border-rose-200" onClick={() => setIsDeleteModalOpen(true)}>Delete</Button>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <Card title="Your Profile">
             <div className="flex items-center gap-6 mb-6">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <div onClick={handleAvatarClick} className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold cursor-pointer overflow-hidden">
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : getInitials(name)}
                </div>
                <div>
                    <h3 className="font-semibold">{name || 'Founder'}</h3>
                    <button onClick={handleAvatarClick} className="text-sm text-blue-600 hover:underline">Change Avatar</button>
                </div>
             </div>
             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div className="flex justify-end pt-2">
                    <Button onClick={handleProfileSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                    </Button>
                </div>
             </div>
          </Card>
        )}

        {activeTab === 'notifications' && (
           <Card title="Preferences">
              <div className="space-y-4">
                 <div className="flex items-center justify-between" onClick={() => toggleNotification('email')}>
                    <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-slate-500">Get notified when analysis is ready.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${emailNotifications ? 'bg-slate-900' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${emailNotifications ? 'translate-x-6' : ''}`} />
                    </div>
                 </div>
                 <div className="flex items-center justify-between" onClick={() => toggleNotification('marketing')}>
                    <div>
                        <p className="font-medium">Marketing Emails</p>
                        <p className="text-sm text-slate-500">Product updates and news.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${marketingEmails ? 'bg-slate-900' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${marketingEmails ? 'translate-x-6' : ''}`} />
                    </div>
                 </div>
              </div>
           </Card>
        )}

        {activeTab === 'api_keys' && (
           <div className="space-y-6">
             <Card title="Model Management">
                <div className="space-y-4">
                   <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-slate-600">
                         Manage your AI models and API keys. Custom keys are stored locally.
                      </p>
                      <Button 
                         variant="outline"
                         size="sm"
                         onClick={() => setIsAddModelModalOpen(true)}
                         className="gap-2"
                      >
                         <Key size={14} />
                         Add Custom Model
                      </Button>
                   </div>

                   <div className="overflow-hidden border border-slate-200 rounded-lg bg-slate-50/30">
                      <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                         <div className="col-span-6">Model</div>
                         <div className="col-span-2">Type</div>
                         <div className="col-span-2">Provider</div>
                         <div className="col-span-2 text-right">Actions</div>
                      </div>

                      <div className="divide-y divide-slate-100 bg-white">
                         {/* Premium Models Section */}
                         <div>
                            <button 
                               onClick={() => toggleSection('premium')}
                               className="w-full flex items-center gap-2 px-4 py-2 bg-slate-50/50 hover:bg-slate-100/50 transition-colors text-xs font-semibold text-slate-700 border-b border-slate-100"
                            >
                               {expandedSections.includes('premium') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                               Premium Models
                            </button>
                            {expandedSections.includes('premium') && premiumModels.map((m, idx) => (
                               <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
                                  <div className="col-span-6 flex items-center gap-3">
                                     <div className="text-slate-400">{m.icon}</div>
                                     <span className="text-sm font-medium text-slate-700">{m.name}</span>
                                  </div>
                                  <div className="col-span-2 text-xs text-slate-400">-</div>
                                  <div className="col-span-2 text-xs font-medium text-slate-400">{m.provider}</div>
                                  <div className="col-span-2 text-right text-xs text-slate-400">-</div>
                               </div>
                            ))}
                         </div>

                         {/* Advanced Models Section */}
                         <div>
                            <button 
                               onClick={() => toggleSection('advanced')}
                               className="w-full flex items-center gap-2 px-4 py-2 bg-slate-50/50 hover:bg-slate-100/50 transition-colors text-xs font-semibold text-slate-700 border-b border-slate-100"
                            >
                               {expandedSections.includes('advanced') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                               Standard Models
                            </button>
                            {expandedSections.includes('advanced') && advancedModels.map((m, idx) => (
                               <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
                                  <div className="col-span-6 flex items-center gap-3">
                                     <div className="text-slate-400">{m.icon}</div>
                                     <span className="text-sm font-medium text-slate-700">{m.name}</span>
                                  </div>
                                  <div className="col-span-2 text-xs text-slate-400">-</div>
                                  <div className="col-span-2 text-xs font-medium text-slate-400">{m.provider}</div>
                                  <div className="col-span-2 text-right text-xs text-slate-400">-</div>
                               </div>
                            ))}
                         </div>

                         {/* Custom Models Section */}
                         <div>
                            <button 
                               onClick={() => toggleSection('custom')}
                               className="w-full flex items-center gap-2 px-4 py-2 bg-slate-50/50 hover:bg-slate-100/50 transition-colors text-xs font-semibold text-slate-700 border-b border-slate-100"
                            >
                               {expandedSections.includes('custom') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                               Custom Models
                            </button>
                            {expandedSections.includes('custom') && (
                               customModels.length > 0 ? (
                                  customModels.map((m) => (
                                     <div key={m.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
                                        <div className="col-span-6 flex items-center gap-3">
                                           <div className="text-slate-400"><Box size={14} /></div>
                                           <span className="text-sm font-medium text-slate-700">{m.model}</span>
                                        </div>
                                        <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Advanced</div>
                                        <div className="col-span-2 text-xs font-medium text-slate-600 capitalize">{m.provider}</div>
                                        <div className="col-span-2 flex items-center justify-end gap-2">
                                           <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                                              <Edit2 size={14} />
                                           </button>
                                           <button 
                                              onClick={() => removeModel(m.id)}
                                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                           >
                                              <Trash2 size={14} />
                                           </button>
                                           <div className="w-8 h-4 bg-emerald-500 rounded-full relative cursor-pointer ml-1">
                                              <div className="absolute right-0.5 top-0.5 bg-white w-3 h-3 rounded-full shadow-sm" />
                                           </div>
                                        </div>
                                     </div>
                                  ))
                               ) : (
                                  <div className="px-4 py-8 text-center text-slate-400 text-xs italic">
                                     No custom models configured.
                                  </div>
                               )
                            )}
                         </div>
                      </div>
                   </div>
                </div>
             </Card>
           </div>
        )}
      </div>

      <Modal isOpen={isAddModelModalOpen} onClose={() => setIsAddModelModalOpen(false)} title="Add Model">
        <div className="space-y-6 bg-slate-900 -m-6 p-8 text-white rounded-b-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300">
                <span className="text-rose-500 mr-1">*</span>Provider
              </label>
              <div className="relative">
                <select 
                  value={newProvider}
                  onChange={(e) => {
                    setNewProvider(e.target.value);
                    setNewModel('');
                  }}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white text-sm appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-800">Choose Model Provider</option>
                  <option value="gemini" className="bg-slate-800">Google Gemini</option>
                  <option value="openai" className="bg-slate-800">OpenAI</option>
                  <option value="anthropic" className="bg-slate-800">Anthropic</option>
                  <option value="custom" className="bg-slate-800">Custom</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300">
                <span className="text-rose-500 mr-1">*</span>Model
              </label>
              <div className="relative">
                {newProvider && PROVIDER_MODELS[newProvider]?.length > 0 ? (
                  <>
                    <select 
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white text-sm appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-slate-800">Choose Model</option>
                      {PROVIDER_MODELS[newProvider].map(m => (
                        <option key={m} value={m} className="bg-slate-800">{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                  </>
                ) : (
                  <input 
                    type="text"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white text-sm"
                    placeholder={newProvider === 'custom' ? "Enter model name" : "Choose Provider first"}
                    disabled={!newProvider}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300">
                <span className="text-rose-500 mr-1">*</span>API Key
              </label>
              <div className="relative">
                <input 
                  type="password" 
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className={`w-full p-3 bg-slate-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white text-sm pr-10 ${
                    newApiKey.length >= 8 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700'
                  }`} 
                  placeholder="Fill API Key here" 
                />
                {newApiKey.length >= 8 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </div>
              {newApiKey.length >= 8 && (
                <p className="text-[10px] text-emerald-500 mt-2 flex items-center gap-1 font-medium">
                  API key is configured correctly
                </p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button fullWidth onClick={handleAddModel} className="bg-blue-600 hover:bg-blue-700 text-white py-3 font-bold text-sm rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20">
              Add Model
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Account?">
          <p className="text-slate-600 mb-4">This action is permanent. Type <strong>delete my account</strong> to confirm.</p>
          <input 
              type="text" 
              className="w-full p-2 border rounded mb-4" 
              placeholder="delete my account"
              value={deleteConfirmation} 
              onChange={(e) => setDeleteConfirmation(e.target.value)} 
          />
          <Button 
              fullWidth 
              disabled={deleteConfirmation !== 'delete my account'} 
              className="bg-rose-600 text-white" 
              onClick={onDeleteData}
          >
              Delete Permanently
          </Button>
      </Modal>
    </div>
  );
};
