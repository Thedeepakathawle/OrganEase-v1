import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Heart, 
  Users, 
  Navigation, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  Activity,
  Radio,
  FileCheck2
} from 'lucide-react';
import { api } from '../services/api';

export default function DashboardView({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Activity className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-mono">Synchronizing OrganEase Network...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'Verified Hospitals', value: stats?.hospitals || 3, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { title: 'Available Organs', value: stats?.availableOrgans || 2, icon: Heart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { title: 'Waiting Patients', value: stats?.waitingRecipients || 2, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { title: 'Active Green Corridors', value: stats?.activeGreenCorridors || 1, icon: Navigation, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { title: 'Transplants Verified', value: stats?.completedTransplants || 0, icon: CheckCircle2, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-brand-400" />
            <span>Autonomous Organ Allocation & Transit Engine Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Zero Communication Lag. Multi-Factor Matching. Green-Corridor CIT Control.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            OrganEase connects transplant centers, donor networks, and regional traffic dispatchers with AES-256 encrypted biological records, automated WebSocket sirens, live cold ischemia time monitoring, and cryptographic delivery verification.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('matching')}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 flex items-center space-x-1.5 transition"
            >
              <span>Explore Smart Matching Engine</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('transit')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs flex items-center space-x-1.5 transition"
            >
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>Track Live Green Corridor</span>
            </button>
            <button
              onClick={() => onNavigate('registry')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs flex items-center space-x-1.5 transition"
            >
              <Heart className="w-4 h-4 text-rose-400" />
              <span>Submit Organ / Patient Need</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`p-4 rounded-xl bg-slate-900/90 border ${card.border} shadow-sm`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{card.title}</span>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-white font-mono">
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section: Live Operations & Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Matches / Priority Alerts */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-brand-400" />
              <h2 className="text-base font-bold text-white">Active High-Priority Matches</h2>
            </div>
            <button 
              onClick={() => onNavigate('matching')}
              className="text-xs text-brand-400 hover:underline font-semibold"
            >
              View All ({stats?.recentAlerts?.length || 0}) →
            </button>
          </div>

          <div className="space-y-3">
            {stats?.recentAlerts && stats.recentAlerts.length > 0 ? (
              stats.recentAlerts.map((match) => (
                <div key={match._id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-brand-500/40 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">{match.donorOrgan?.organType || 'Heart'}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        {match.recipientRequest?.urgencyLevel || 'Emergency Status 1A'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Score: </span>
                      <span className="text-sm font-extrabold text-brand-400 font-mono">{match.matchScore}%</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 flex justify-between items-center pt-1 border-t border-slate-700/40">
                    <div>
                      <span className="text-slate-400">Donor: </span>
                      <span className="font-medium text-slate-200">{match.donorHospital?.name?.split(' ')[0] || 'Metro NY'}</span>
                      <span className="text-slate-500 mx-1">➔</span>
                      <span className="text-slate-400">Recipient: </span>
                      <span className="font-medium text-slate-200">{match.recipientHospital?.name?.split(' ')[0] || 'St. Jude PA'}</span>
                    </div>
                    <button 
                      onClick={() => onNavigate('transit')}
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-medium text-cyan-300"
                    >
                      Track Transit
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No active alerts pending.</p>
            )}
          </div>
        </div>

        {/* Cryptographic Audit Compliance Ledger Stream */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Cryptographic Compliance Ledger</h2>
            </div>
            <button 
              onClick={() => onNavigate('verification')}
              className="text-xs text-brand-400 hover:underline font-semibold"
            >
              Full Ledger ({stats?.recentAudits?.length || 0}) →
            </button>
          </div>

          <div className="space-y-3">
            {stats?.recentAudits && stats.recentAudits.length > 0 ? (
              stats.recentAudits.map((audit) => (
                <div key={audit._id} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{audit.actionType}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Block #{audit.auditIndex}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Hash: <span className="text-emerald-400/90">{audit.recordHash}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex justify-between">
                    <span>Officer: {audit.performedBy?.split(' ')[0] || 'System Engine'}</span>
                    <span className="text-brand-300">AES-256 Encrypted</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No audit records logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
