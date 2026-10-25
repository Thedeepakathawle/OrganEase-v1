import React, { useState, useEffect } from 'react';
import { 
  GitMerge, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  BarChart3, 
  Info,
  Radio
} from 'lucide-react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';

export default function MatchingEngineView({ onAcceptMatch }) {
  const { playEmergencySiren } = useSocket();
  const [matches, setMatches] = useState([]);
  const [donors, setDonors] = useState([]);
  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [selectedMatchForDetail, setSelectedMatchForDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchMatchesAndDonors = async () => {
    try {
      const [matchesRes, donorsRes] = await Promise.all([
        api.getMatches(),
        api.getDonors()
      ]);
      if (matchesRes.success) setMatches(matchesRes.matches);
      if (donorsRes.success && donorsRes.organs.length > 0) {
        setDonors(donorsRes.organs);
        if (!selectedDonorId) setSelectedDonorId(donorsRes.organs[0]._id);
      }
    } catch (err) {
      console.error('Fetch matching error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchesAndDonors();
  }, []);

  const handleTriggerMatching = async () => {
    if (!selectedDonorId) return;
    setEvaluating(true);
    setActionFeedback(null);
    try {
      const res = await api.triggerMatching(selectedDonorId);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: `Core Organ Matching Engine executed successfully: ${res.matches?.length || 0} candidate pairings scored.`
        });
        fetchMatchesAndDonors();
        playEmergencySiren();
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setEvaluating(false);
    }
  };

  const handleAccept = async (matchId) => {
    try {
      const res = await api.acceptMatch(matchId);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: `Match formally accepted! Cryptographic Handshake Key generated: ${res.deliveryKey}. Dispatching Green Corridor...`
        });
        fetchMatchesAndDonors();
        if (onAcceptMatch) onAcceptMatch(res.match);
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-brand-400 text-xs font-bold uppercase tracking-wider">
            <GitMerge className="w-4 h-4" />
            <span>Pillars 3 & 4: Core Organ Matching Engine & Real-Time Alerts</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Multi-Factor Algorithmic Prioritization</h2>
          <p className="text-xs text-slate-400">
            Evaluates Blood Compatibility, Organ Type & Urgency, HLA Tissue Concordance, and Cold Ischemia Time limits with zero communication lag.
          </p>
        </div>

        {/* Manual Trigger Bar */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 text-xs">
          <select
            value={selectedDonorId}
            onChange={(e) => setSelectedDonorId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium"
          >
            {donors.map(d => (
              <option key={d._id} value={d._id}>
                {d.organType} ({d.bloodType}) - {d.donorId}
              </option>
            ))}
          </select>
          <button
            onClick={handleTriggerMatching}
            disabled={evaluating}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white font-bold flex items-center space-x-1.5 transition shadow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{evaluating ? 'Computing Scoring...' : 'Run Engine'}</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
            : 'bg-red-500/10 text-red-300 border border-red-500/30'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Ranked Candidate Match Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            <span>Algorithmic Matches ({matches.length})</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Sorted by Priority Composite Score</span>
        </div>

        {matches.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            No active computed matches. Click "Run Engine" above or submit a new organ from the registry.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {matches.map((match, idx) => {
              const isTop = idx === 0;
              return (
                <div 
                  key={match._id}
                  className={`p-6 rounded-2xl bg-slate-900 border transition-all ${
                    isTop 
                      ? 'border-brand-500/60 shadow-xl shadow-brand-500/10 ring-1 ring-brand-500/30' 
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Summary */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-black text-white flex items-center space-x-2">
                          <span>{match.donorOrgan?.organType || 'Heart'}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-mono border border-brand-500/30">
                            {match.donorOrgan?.bloodType} ➔ {match.recipientRequest?.bloodType}
                          </span>
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          {match.recipientRequest?.urgencyLevel || 'Emergency Status 1A'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          match.status === 'accepted' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {match.status}
                        </span>
                      </div>

                      {/* Hospitals and Distance */}
                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div>
                          <span className="text-slate-400">Donor: </span>
                          <span className="font-semibold text-slate-100">{match.donorHospital?.name} ({match.donorHospital?.city})</span>
                        </div>
                        <span className="text-slate-500">➔</span>
                        <div>
                          <span className="text-slate-400">Recipient: </span>
                          <span className="font-semibold text-slate-100">{match.recipientHospital?.name} ({match.recipientHospital?.city})</span>
                        </div>
                        <div className="text-brand-300 flex items-center space-x-1 font-mono">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{match.distanceKm} km</span>
                        </div>
                        <div className="text-emerald-400 flex items-center space-x-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          <span>CIT Margin: {match.safeCitMarginHours}h safe</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Score Gauge & Actions */}
                    <div className="flex items-center space-x-4 lg:self-center">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Composite Score</span>
                        <div className="text-3xl font-black text-brand-400 font-mono tracking-tight">
                          {match.matchScore}%
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => setSelectedMatchForDetail(match)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition"
                        >
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                          <span>Breakdown</span>
                        </button>

                        {match.status !== 'accepted' && match.status !== 'in_transit' && match.status !== 'delivered' && (
                          <button
                            onClick={() => handleAccept(match._id)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition"
                          >
                            <span>Accept & Dispatch</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Factor Progress Bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-800 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Blood Compatibility</span>
                        <span className="font-mono text-slate-200">{match.scoreBreakdown?.bloodGroupScore}/30</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-brand-500 h-full rounded-full" 
                          style={{ width: `${((match.scoreBreakdown?.bloodGroupScore || 0) / 30) * 100}%` }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Clinical Urgency</span>
                        <span className="font-mono text-slate-200">{match.scoreBreakdown?.urgencyScore}/35</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-red-500 h-full rounded-full" 
                          style={{ width: `${((match.scoreBreakdown?.urgencyScore || 0) / 35) * 100}%` }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>HLA Tissue Concordance</span>
                        <span className="font-mono text-slate-200">{match.scoreBreakdown?.hlaTissueScore}/12</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-cyan-500 h-full rounded-full" 
                          style={{ width: `${((match.scoreBreakdown?.hlaTissueScore || 0) / 12) * 100}%` }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Cold Ischemia Feasibility</span>
                        <span className="font-mono text-slate-200">{match.scoreBreakdown?.citFeasibilityScore}/12</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-purple-500 h-full rounded-full" 
                          style={{ width: `${((match.scoreBreakdown?.citFeasibilityScore || 0) / 12) * 100}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transparent Algorithmic Breakdown Modal */}
      {selectedMatchForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-brand-400" />
                <h4 className="text-base font-bold text-white">Algorithmic Scoring Audit Breakdown</h4>
              </div>
              <button 
                onClick={() => setSelectedMatchForDetail(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
                <span className="text-slate-400 uppercase text-[10px] block">Algorithmic Formulation:</span>
                <div className="text-brand-300">
                  Total Match Score = BloodCompatibility(30) + UrgencyStatus(35) + HLATissueConcordance(12) + SeverityIndex(8) + CITFeasibility(12) + WaitlistBonus(3)
                </div>
              </div>

              {/* Factor Notes */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-300 uppercase text-[10px] tracking-wide block">
                  Clinical Justification Notes:
                </span>
                {selectedMatchForDetail.scoreBreakdown?.notes?.map((note, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>

              {/* Cryptographic Handshake Key info */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cryptographic Handshake Key (For Delivery Verification):</span>
                  <span className="font-mono text-white text-sm font-bold">{selectedMatchForDetail.deliveryKey}</span>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                  AES-256 Protected
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
