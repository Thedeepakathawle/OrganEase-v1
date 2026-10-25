import React from 'react';
import { AlertTriangle, Clock, ArrowRight, ShieldCheck, MapPin, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';

export default function EmergencyAlertModal({ onMatchAccepted }) {
  const { activeAlert, dismissAlert } = useSocket();

  if (!activeAlert) return null;

  const handleAccept = async () => {
    try {
      const res = await api.acceptMatch(activeAlert.matchId);
      if (res.success) {
        dismissAlert();
        if (onMatchAccepted) onMatchAccepted(res.match);
      }
    } catch (err) {
      console.error('Accept match error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-red-500/80 rounded-2xl shadow-2xl shadow-red-500/20 overflow-hidden emergency-pulse">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-red-950/60 px-2 py-0.5 rounded text-red-200">
                WebSocket Real-Time Emergency Notification
              </span>
              <h3 className="text-lg font-extrabold tracking-tight">
                CRITICAL ORGAN MATCH IDENTIFIED
              </h3>
            </div>
          </div>
          <button 
            onClick={dismissAlert}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Main Score Hero */}
          <div className="flex items-center justify-between bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div>
              <span className="text-xs text-slate-400 font-medium">Organ Type & Urgency</span>
              <div className="text-2xl font-black text-white flex items-center space-x-2 mt-0.5">
                <span>{activeAlert.organType}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  {activeAlert.urgencyLevel || 'Emergency Status 1A'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Algorithmic Score</span>
              <div className="text-3xl font-extrabold text-brand-400 font-mono">
                {activeAlert.matchScore}%
              </div>
            </div>
          </div>

          {/* Donor & Recipient Hospitals */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block mb-1">Donor Procurement Center:</span>
              <span className="font-semibold text-slate-200 block text-sm">{activeAlert.donorHospitalName || 'Metro Trauma Center (NY)'}</span>
              <span className="text-emerald-400 text-[11px] flex items-center mt-1">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Organ Verified
              </span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block mb-1">Recipient Destination:</span>
              <span className="font-semibold text-slate-200 block text-sm">{activeAlert.recipientHospitalName || 'St. Jude Institute (PA)'}</span>
              <span className="text-amber-400 text-[11px] flex items-center mt-1">
                <Clock className="w-3.5 h-3.5 mr-1" /> Patient in OR Prepped
              </span>
            </div>
          </div>

          {/* CIT Time & Distance */}
          <div className="flex items-center justify-between text-xs bg-brand-950/40 p-3 rounded-lg border border-brand-500/20 text-brand-300">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              <span>Distance: <strong>{activeAlert.distanceKm} km</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>Safe CIT Margin: <strong>{activeAlert.safeCitMarginHours} hours remaining</strong></span>
            </div>
          </div>

          {/* Score breakdown chips */}
          {activeAlert.scoreBreakdown?.notes && (
            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/40 text-[11px] space-y-1 text-slate-300">
              <span className="font-semibold text-slate-400 block uppercase text-[10px]">Evaluation Factors:</span>
              {activeAlert.scoreBreakdown.notes.slice(0, 3).map((note, idx) => (
                <div key={idx} className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={dismissAlert}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Stand By / Close
            </button>
            <button
              onClick={handleAccept}
              className="flex-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition"
            >
              <span>Accept Match & Dispatch Corridor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
