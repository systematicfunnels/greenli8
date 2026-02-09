import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyViewProps {
  onBack: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <button 
        onClick={onBack} 
        className="flex items-center text-slate-500 hover:text-slate-900 mb-8 transition-colors"
      >
        <ArrowLeft size={16} className="mr-2" /> Back
      </button>

      <div className="prose prose-slate max-w-none">
        <h1>Privacy Policy</h1>
        <p className="text-slate-500 text-lg mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Introduction</h2>
        <p>Welcome to Greenli8. We respect your privacy and are committed to protecting your personal data.</p>

        <h2>2. Data We Collect</h2>
        <ul>
            <li><strong>Identity Data:</strong> Name, email address, Google profile info.</li>
            <li><strong>Usage Data:</strong> Ideas submitted, reports generated, interactions with our AI.</li>
            <li><strong>Technical Data:</strong> IP address, browser type, device information.</li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <p>We use your data to:</p>
        <ul>
            <li>Provide AI analysis of your startup ideas.</li>
            <li>Process payments and manage your credits.</li>
            <li>Improve our services and train our models (anonymized data only).</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>We implement appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way.</p>

        <h2>5. Contact Us</h2>
        <p>If you have any questions about this privacy policy, please contact us at support@greenli8.com.</p>
      </div>
    </div>
  );
};