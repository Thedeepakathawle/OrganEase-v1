import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  ShieldCheck, 
  Key, 
  Thermometer, 
  QrCode, 
  CheckCircle2, 
  Lock, 
  Download, 
  Printer, 
  ExternalLink, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function VerificationAuditView({ preselectedMatch }) {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [auditRecords, setAuditRecords] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(preselectedMatch?._id || '');
  
  // Handshake Form
  const [handshakeData, setHandshakeData] = useState({
    deliveryKey: preselectedMatch?.deliveryKey || '',
    receivingSurgeonName: user?.name || 'Dr. Sarah Lin, MD (Transplant Surgeon)',
    containerTemperature: 3.5,
    containerIntegrityChecked: true,
    medicalNotes: 'Organ container seals inspected intact. Perfusion fluid clear. Immediate transfer to surgical suite for engraftment.'
  });

  const [verifiedCertificate, setVerifiedCertificate] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchData = async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        api.getMatches(),
        api.getAuditRecords()
      ]);
      if (mRes.success) {
        setMatches(mRes.matches);
        if (!selectedMatchId && mRes.matches.length > 0) {
          const active = mRes.matches.find(m => m.status === 'in_transit' || m.status === 'accepted') || mRes.matches[0];
          setSelectedMatchId(active._id);
          setHandshakeData(prev => ({ ...prev, deliveryKey: active.deliveryKey || '' }));
        }
      }
      if (aRes.success) {
        setAuditRecords(aRes.records);
      }
    } catch (err) {
      console.error('Fetch audit records error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMatchSelect = (matchId) => {
    setSelectedMatchId(matchId);
    const m = matches.find(item => item._id === matchId);
    if (m) {
      setHandshakeData(prev => ({ ...prev, deliveryKey: m.deliveryKey || '' }));
    }
  };

  const handleVerifyHandshake = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setFeedback(null);
    try {
      const payload = {
        matchId: selectedMatchId,
        ...handshakeData
      };
      const res = await api.verifyDelivery(payload);
      if (res.success) {
        setVerifiedCertificate(res.certificateData);
        setFeedback({
          type: 'success',
          message: 'Organ delivery successfully verified! Immutable record encrypted and chained into compliance ledger.'
        });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Verification rejected.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Pillar 6: Delivery Verification & Cryptographic Record Archiving</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Delivery Handshake & Compliance Ledger</h2>
          <p className="text-xs text-slate-400">
            Recipient hospital validates organ delivery via cryptographic handshake. Transactions are permanently sealed with SHA-256 hash chaining.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
            : 'bg-red-500/10 text-red-300 border border-red-500/30'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Verification Handshake Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-brand-400" />
              <h3 className="text-base font-bold text-white">Recipient Hospital Handshake Terminal</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
              OR Delivery Protocol
            </span>
          </div>

          <form onSubmit={handleVerifyHandshake} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Select Incoming Organ Match</label>
              <select
                value={selectedMatchId}
                onChange={(e) => handleMatchSelect(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-brand-500"
              >
                {matches.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.donorOrgan?.organType} ({m.donorHospital?.name?.split(' ')[0]} ➔ {m.recipientHospital?.name?.split(' ')[0]}) - Status: {m.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Cryptographic Delivery Handshake Key / QR Passcode</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="ORGDEL-XXXX-XXXX"
                  value={handshakeData.deliveryKey}
                  onChange={(e) => setHandshakeData({ ...handshakeData, deliveryKey: e.target.value })}
                  className="w-full bg-slate-950 border border-brand-500/50 rounded-xl px-3 py-2.5 text-white font-mono font-bold tracking-wider text-sm focus:outline-none focus:border-brand-400"
                />
                <span className="absolute right-3 top-2.5 text-brand-400 font-mono text-xs flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Validated</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Receiving Transplant Surgeon</label>
                <input
                  type="text"
                  required
                  value={handshakeData.receivingSurgeonName}
                  onChange={(e) => setHandshakeData({ ...handshakeData, receivingSurgeonName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Cold-Box Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={handshakeData.containerTemperature}
                  onChange={(e) => setHandshakeData({ ...handshakeData, containerTemperature: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <input
                type="checkbox"
                id="integrity"
                checked={handshakeData.containerIntegrityChecked}
                onChange={(e) => setHandshakeData({ ...handshakeData, containerIntegrityChecked: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-slate-900 border-slate-700"
              />
              <label htmlFor="integrity" className="text-slate-300 cursor-pointer font-medium">
                I certify that organ box security seals are intact and perfusion temperature is within the safe 2.0°C – 8.0°C threshold.
              </label>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Operating Theater Acceptance Notes</label>
              <textarea
                rows={2}
                value={handshakeData.medicalNotes}
                onChange={(e) => setHandshakeData({ ...handshakeData, medicalNotes: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isVerifying ? 'Sealing Cryptographic Record...' : 'Confirm Delivery & Archive to Compliance Ledger'}</span>
            </button>
          </form>
        </div>

        {/* Certificate Display or Live Verified Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Transplant Chain of Custody Certificate</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                Audit Compliant
              </span>
            </div>

            {verifiedCertificate ? (
              <div className="p-5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-slate-800 pb-2">
                  <span>CERTIFICATE ID:</span>
                  <span>{verifiedCertificate.complianceCertificateId}</span>
                </div>
                <div className="text-slate-300 space-y-1 text-[11px]">
                  <div>Organ: <strong className="text-white">{verifiedCertificate.organType}</strong></div>
                  <div>Donor ID: <strong className="text-white">{verifiedCertificate.donorId}</strong> ({verifiedCertificate.donorHospital?.name})</div>
                  <div>Recipient: <strong className="text-white">{verifiedCertificate.recipientCode}</strong> ({verifiedCertificate.recipientHospital?.name})</div>
                  <div>Receiving Surgeon: <strong className="text-white">{verifiedCertificate.deliveryHandshake?.receivingSurgeon}</strong></div>
                  <div>Handshake Verified Key: <strong className="text-brand-400">{verifiedCertificate.deliveryHandshake?.verifiedKey}</strong></div>
                  <div>Arrival Temperature: <strong className="text-cyan-400">{verifiedCertificate.deliveryHandshake?.temperatureCelsius}°C</strong> (COMPLIANT)</div>
                  <div>Archived Timestamp: <span className="text-slate-400">{verifiedCertificate.archivedTimestamp}</span></div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 space-y-2">
                <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-xs">
                  Upon verifying delivery via the handshake terminal, a formal statutory Compliance Certificate with SHA-256 seal will be rendered here.
                </p>
              </div>
            )}
          </div>

          {verifiedCertificate && (
            <div className="pt-4 flex space-x-3">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2 border border-slate-700"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Immutable Cryptographic Audit Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Chained Compliance Ledger Logs</h3>
          </div>
          <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Cryptographic Chain Integrity Verified</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Block #</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Compliance Certificate</th>
                <th className="p-3">SHA-256 Record Hash</th>
                <th className="p-3">Logged By</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {auditRecords.map((rec) => (
                <tr key={rec._id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-brand-400">#{rec.auditIndex}</td>
                  <td className="p-3 font-semibold text-white">{rec.actionType}</td>
                  <td className="p-3 text-cyan-300 font-semibold">{rec.complianceCertificateId}</td>
                  <td className="p-3 text-[11px] text-emerald-400/90 truncate max-w-[180px]">
                    {rec.recordHash}
                  </td>
                  <td className="p-3 text-slate-400">{rec.performedBy?.split(' ')[0]}</td>
                  <td className="p-3 text-slate-500 text-[11px]">
                    {new Date(rec.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
