import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Download, Shield, Mail, User, Bell, Lock, Camera, CheckCircle2, AlertCircle, Loader2, AlertTriangle, FileArchive } from 'lucide-react';
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
  onBack, 
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
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'notifications'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  
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

  const handlePasswordReset = () => {
      setPasswordResetSent(true);
      setTimeout(() => setPasswordResetSent(false), 3000);
      alert(`Password reset link sent to ${email}`);
  };

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
      </div>

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
