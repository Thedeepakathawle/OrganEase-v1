import React, { useState } from 'react';
import Navbar from './components/Navbar';
import EmergencyAlertModal from './components/EmergencyAlertModal';
import DashboardView from './components/DashboardView';
import OnboardingView from './components/OnboardingView';
import OrganRegistryView from './components/OrganRegistryView';
import MatchingEngineView from './components/MatchingEngineView';
import TransitTrackerView from './components/TransitTrackerView';
import VerificationAuditView from './components/VerificationAuditView';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [preselectedMatch, setPreselectedMatch] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTriggerSimulation = async () => {
    try {
      showToast('Re-seeding database and initiating fresh emergency organ scenario...');
      const res = await api.reseedDatabase();
      if (res.success) {
        showToast('Fresh scenario active! Live Green Corridor transit ready for tracking.');
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error('Reset simulation error:', err);
    }
  };

  const handleMatchAccepted = (match) => {
    setPreselectedMatch(match);
    showToast(`Match accepted! Switching to Live Transit & CIT tracking...`);
    setActiveTab('transit');
  };

  const handleProceedToVerification = (match) => {
    setPreselectedMatch(match);
    showToast('Organ arrived! Switching to Delivery Handshake Terminal...');
    setActiveTab('verification');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-brand-500/50 text-white text-xs px-4 py-3 rounded-xl shadow-2xl shadow-brand-500/20 flex items-center space-x-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-brand-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global WebSocket Emergency Alert Modal */}
      <EmergencyAlertModal onMatchAccepted={handleMatchAccepted} />

      {/* Main Top Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onTriggerSimulation={handleTriggerSimulation} 
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView onNavigate={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'onboarding' && (
          <OnboardingView />
        )}
        {activeTab === 'registry' && (
          <OrganRegistryView 
            onMatchTriggered={() => {
              showToast('Matching Engine computed candidates! Switching to Matching Engine...');
              setActiveTab('matching');
            }} 
          />
        )}
        {activeTab === 'matching' && (
          <MatchingEngineView onAcceptMatch={handleMatchAccepted} />
        )}
        {activeTab === 'transit' && (
          <TransitTrackerView onProceedToVerification={handleProceedToVerification} />
        )}
        {activeTab === 'verification' && (
          <VerificationAuditView preselectedMatch={preselectedMatch} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OrganEase MERN Medical Platform • HIPAA & Audit Compliant</span>
          <span className="font-mono text-slate-600">AES-256-GCM Biological Encryption • WebSocket Siren Active</span>
        </div>
      </footer>
    </div>
  );
}
