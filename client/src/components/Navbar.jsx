import React from 'react';
import { 
  Heart, 
  Activity, 
  ShieldCheck, 
  GitMerge, 
  Navigation, 
  FileText, 
  UserCheck, 
  Volume2, 
  VolumeX, 
  Radio, 
  RefreshCw,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Navbar({ activeTab, setActiveTab, onTriggerSimulation }) {
  const { user, loginDemoUser } = useAuth();
  const { connectionStatus, soundEnabled, setSoundEnabled, notifications, activeAlert } = useSocket();

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: Activity },
    { id: 'onboarding', label: 'Onboarding & Auth', icon: ShieldCheck },
    { id: 'registry', label: 'Organ Registry', icon: Heart },
    { id: 'matching', label: 'Smart Matching Engine', icon: GitMerge, badge: activeAlert ? 'ALERT' : null },
    { id: 'transit', label: 'Live Transit & CIT', icon: Navigation, badge: 'LIVE' },
    { id: 'verification', label: 'Delivery & Ledger', icon: FileText }
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Emergency Active Alert Ribbon if active */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 animate-spin" />
            <span>CRITICAL ORGAN MATCH FOUND: {activeAlert.organType} (Score: {activeAlert.matchScore}%) between {activeAlert.donorHospitalName} and {activeAlert.recipientHospitalName}</span>
          </div>
          <button 
            onClick={() => setActiveTab('matching')}
            className="underline hover:text-white font-bold ml-4"
          >
            Review & Authorize Match →
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Heart className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-teal-300 bg-clip-text text-transparent">
                  OrganEase
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  MERN v2.6
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Intelligent Organ Allocation & Transit Corridor</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-slate-800 text-brand-400 border border-brand-500/30 shadow-sm' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                      item.badge === 'ALERT' 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Controls: Persona Switcher, Live Indicator, Audio Siren, Scenario Run */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Demo Persona Switcher */}
            <div className="hidden lg:flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-xs">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Role:</span>
              <button 
                onClick={() => loginDemoUser('surgeon')}
                title="Transplant Surgeon Persona (St. Jude Philly)"
                className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-700"
              >
                Surgeon
              </button>
              <button 
                onClick={() => loginDemoUser('coordinator')}
                title="Procurement Coordinator Persona (Metro NY)"
                className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-700"
              >
                Coordinator
              </button>
              <button 
                onClick={() => loginDemoUser('dispatcher')}
                title="Logistics Dispatcher Persona"
                className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-700"
              >
                Dispatcher
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Siren sound enabled' : 'Siren muted'}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* WebSocket connection dot */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span className="font-mono text-slate-300 hidden sm:inline">Socket.IO</span>
            </div>

            {/* Reset / Demo Scenario button */}
            <button
              onClick={onTriggerSimulation}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 active:scale-95 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
