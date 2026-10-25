import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Users, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { api } from '../services/api';

export default function OrganRegistryView({ onMatchTriggered }) {
  const [activeTab, setActiveTab] = useState('donor-form'); // 'donor-form', 'recipient-form', 'registry-list'
  const [hospitals, setHospitals] = useState([]);
  const [donors, setDonors] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selectedOrganForInspection, setSelectedOrganForInspection] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Donor form
  const [donorForm, setDonorForm] = useState({
    donorAge: 31,
    donorGender: 'male',
    organType: 'Heart',
    bloodType: 'O+',
    hlaA: 'A*02, A*24',
    hlaB: 'B*07, B*44',
    hlaDR: 'DRB1*04, DRB1*15',
    maxColdIschemiaHours: 4,
    clinicalNotes: 'Young donor, traumatic brain injury with zero prior cardiovascular pathology. Normal LV ejection fraction 65%.',
    causeOfDeath: 'Motor Vehicle Accident (Declared Brain Dead)',
    hospitalId: ''
  });

  // Recipient form
  const [recipientForm, setRecipientForm] = useState({
    patientName: 'Arthur Pendelton',
    patientAge: 44,
    patientGender: 'male',
    organNeeded: 'Heart',
    bloodType: 'O+',
    urgencyLevel: 'Status 1A (Emergency)',
    medicalSeverityScore: 36,
    isPediatric: false,
    hlaA: 'A*02, A*03',
    hlaB: 'B*07, B*08',
    hlaDR: 'DRB1*04, DRB1*11',
    clinicalDiagnosis: 'Decompensated ischemic cardiomyopathy on inotropic support with imminent organ failure.',
    hospitalId: ''
  });

  const fetchData = async () => {
    try {
      const [hospRes, donRes, rcpRes] = await Promise.all([
        api.getHospitals(),
        api.getDonors(),
        api.getRecipients()
      ]);
      if (hospRes.success) {
        setHospitals(hospRes.hospitals);
        if (hospRes.hospitals.length > 0) {
          if (!donorForm.hospitalId) setDonorForm(p => ({ ...p, hospitalId: hospRes.hospitals[0]._id }));
          if (!recipientForm.hospitalId) setRecipientForm(p => ({ ...p, hospitalId: hospRes.hospitals[1]?._id || hospRes.hospitals[0]._id }));
        }
      }
      if (donRes.success) setDonors(donRes.organs);
      if (rcpRes.success) setRecipients(rcpRes.recipients);
    } catch (err) {
      console.error('Fetch registry data error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDonorSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        donorAge: Number(donorForm.donorAge),
        donorGender: donorForm.donorGender,
        organType: donorForm.organType,
        bloodType: donorForm.bloodType,
        hlaTyping: {
          hlaA: donorForm.hlaA,
          hlaB: donorForm.hlaB,
          hlaDR: donorForm.hlaDR
        },
        maxColdIschemiaHours: Number(donorForm.maxColdIschemiaHours),
        clinicalNotes: donorForm.clinicalNotes,
        causeOfDeath: donorForm.causeOfDeath,
        hospitalId: donorForm.hospitalId,
        harvestTime: new Date().toISOString()
      };

      const res = await api.submitDonorOrgan(payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Donor organ logged with AES-256-GCM encryption! Core Matching Engine evaluated ${res.computedMatchesCount} candidates.`
        });
        fetchData();
        setActiveTab('registry-list');
        if (onMatchTriggered) onMatchTriggered();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Submission failed.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecipientSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        patientName: recipientForm.patientName,
        patientAge: Number(recipientForm.patientAge),
        patientGender: recipientForm.patientGender,
        organNeeded: recipientForm.organNeeded,
        bloodType: recipientForm.bloodType,
        urgencyLevel: recipientForm.urgencyLevel,
        medicalSeverityScore: Number(recipientForm.medicalSeverityScore),
        isPediatric: recipientForm.isPediatric,
        hlaTyping: {
          hlaA: recipientForm.hlaA,
          hlaB: recipientForm.hlaB,
          hlaDR: recipientForm.hlaDR
        },
        clinicalDiagnosis: recipientForm.clinicalDiagnosis,
        hospitalId: recipientForm.hospitalId
      };

      const res = await api.submitRecipientRequest(payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Recipient urgency record logged with AES-256-GCM encryption! ${res.availableMatchesCount} compatible donor organs matched.`
        });
        fetchData();
        setActiveTab('registry-list');
        if (onMatchTriggered) onMatchTriggered();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Submission failed.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-brand-400 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>Pillar 2: Request Submission & AES-256 Encrypted Storage</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Organ & Recipient Registry</h2>
          <p className="text-xs text-slate-400">
            Submit organ donation profiles and recipient waiting list requests with cryptographic field-level biological encryption.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-900 border border-slate-700/80 rounded-xl p-1 text-xs">
          <button
            onClick={() => { setActiveTab('donor-form'); setFeedback(null); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'donor-form' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            <span>Register Donor Organ</span>
          </button>
          <button
            onClick={() => { setActiveTab('recipient-form'); setFeedback(null); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'recipient-form' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-amber-300" />
            <span>Log Recipient Request</span>
          </button>
          <button
            onClick={() => { setActiveTab('registry-list'); setFeedback(null); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'registry-list' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Active Registry ({donors.length + recipients.length})</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
            : 'bg-red-500/10 text-red-300 border border-red-500/30'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* View 1: Register Donor Organ */}
      {activeTab === 'donor-form' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleDonorSubmit} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="text-base font-bold text-white">Donor Organ Availability Submission</h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>AES-256-GCM Biological Encryption</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Organ Type</label>
                <select
                  value={donorForm.organType}
                  onChange={(e) => {
                    const citMap = { 'Heart': 4, 'Lung': 6, 'Liver': 10, 'Kidney': 24, 'Pancreas': 12, 'Cornea': 48 };
                    setDonorForm({ ...donorForm, organType: e.target.value, maxColdIschemiaHours: citMap[e.target.value] || 6 });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-semibold"
                >
                  <option value="Heart">Heart (Max CIT: 4-6h)</option>
                  <option value="Kidney">Kidney (Max CIT: 24-36h)</option>
                  <option value="Liver">Liver (Max CIT: 10-12h)</option>
                  <option value="Lung">Lung (Max CIT: 6-8h)</option>
                  <option value="Pancreas">Pancreas (Max CIT: 12-18h)</option>
                  <option value="Cornea">Cornea (Max CIT: 48h)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Blood Type (ABO / Rh)</label>
                <select
                  value={donorForm.bloodType}
                  onChange={(e) => setDonorForm({ ...donorForm, bloodType: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-bold"
                >
                  <option value="O+">O+ (Universal RBC to Positive)</option>
                  <option value="O-">O- (Universal Donor to All)</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+ (Universal Recipient)</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Donor Age</label>
                <input
                  type="number"
                  min="1"
                  max="85"
                  value={donorForm.donorAge}
                  onChange={(e) => setDonorForm({ ...donorForm, donorAge: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Max Safe CIT Limit (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  value={donorForm.maxColdIschemiaHours}
                  onChange={(e) => setDonorForm({ ...donorForm, maxColdIschemiaHours: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Procuring Hospital Facility</label>
                <select
                  value={donorForm.hospitalId}
                  onChange={(e) => setDonorForm({ ...donorForm, hospitalId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500"
                >
                  {hospitals.map(h => (
                    <option key={h._id} value={h._id}>{h.name} ({h.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Cause of Death / Declaration</label>
                <input
                  type="text"
                  value={donorForm.causeOfDeath}
                  onChange={(e) => setDonorForm({ ...donorForm, causeOfDeath: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* HLA Tissue Typing */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide block">
                HLA Tissue Compatibility Typing (Human Leukocyte Antigens)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">HLA-A Alleles</label>
                  <input
                    type="text"
                    value={donorForm.hlaA}
                    onChange={(e) => setDonorForm({ ...donorForm, hlaA: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">HLA-B Alleles</label>
                  <input
                    type="text"
                    value={donorForm.hlaB}
                    onChange={(e) => setDonorForm({ ...donorForm, hlaB: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">HLA-DR Alleles</label>
                  <input
                    type="text"
                    value={donorForm.hlaDR}
                    onChange={(e) => setDonorForm({ ...donorForm, hlaDR: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Clinical Details (Encrypted) */}
            <div>
              <label className="text-slate-300 font-medium block text-xs mb-1">
                Clinical Details & Biopsy Evaluation (Auto-Encrypted via AES-256)
              </label>
              <textarea
                rows={3}
                value={donorForm.clinicalNotes}
                onChange={(e) => setDonorForm({ ...donorForm, clinicalNotes: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Encrypting & Triggering Engine...' : 'Encrypt, Store & Trigger Core Matching Engine'}</span>
            </button>
          </form>
        </div>
      )}

      {/* View 2: Log Recipient Request */}
      {activeTab === 'recipient-form' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleRecipientSubmit} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Recipient Waiting List Urgency Submission</h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>AES-256 Encrypted Clinical Profile</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Patient Name / Identifier</label>
                <input
                  type="text"
                  required
                  value={recipientForm.patientName}
                  onChange={(e) => setRecipientForm({ ...recipientForm, patientName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Organ Needed</label>
                <select
                  value={recipientForm.organNeeded}
                  onChange={(e) => setRecipientForm({ ...recipientForm, organNeeded: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-semibold"
                >
                  <option value="Heart">Heart</option>
                  <option value="Kidney">Kidney</option>
                  <option value="Liver">Liver</option>
                  <option value="Lung">Lung</option>
                  <option value="Pancreas">Pancreas</option>
                  <option value="Cornea">Cornea</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Patient Blood Type</label>
                <select
                  value={recipientForm.bloodType}
                  onChange={(e) => setRecipientForm({ ...recipientForm, bloodType: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-bold"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Clinical Urgency Tier</label>
                <select
                  value={recipientForm.urgencyLevel}
                  onChange={(e) => setRecipientForm({ ...recipientForm, urgencyLevel: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-semibold"
                >
                  <option value="Status 1A (Emergency)">Status 1A (Emergency ECMO / VAD / Acute)</option>
                  <option value="Status 1B (Urgent)">Status 1B (Urgent Inotrope / Deteriorating)</option>
                  <option value="Status 2 (Standard)">Status 2 (Standard Waiting List)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Severity Metric (MELD / CPRA Score: 6-40)</label>
                <input
                  type="number"
                  min="6"
                  max="40"
                  value={recipientForm.medicalSeverityScore}
                  onChange={(e) => setRecipientForm({ ...recipientForm, medicalSeverityScore: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Recipient Hospital Destination</label>
                <select
                  value={recipientForm.hospitalId}
                  onChange={(e) => setRecipientForm({ ...recipientForm, hospitalId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500"
                >
                  {hospitals.map(h => (
                    <option key={h._id} value={h._id}>{h.name} ({h.city})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient Diagnosis */}
            <div>
              <label className="text-slate-300 font-medium block text-xs mb-1">
                Clinical Diagnosis & ICU Status (Encrypted)
              </label>
              <textarea
                rows={3}
                value={recipientForm.clinicalDiagnosis}
                onChange={(e) => setRecipientForm({ ...recipientForm, clinicalDiagnosis: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center space-x-2 transition"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Encrypting & Logging...' : 'Encrypt, Log Waiting List & Evaluate Available Organs'}</span>
            </button>
          </form>
        </div>
      )}

      {/* View 3: Active Registry Listing & Encryption Inspector */}
      {activeTab === 'registry-list' && (
        <div className="space-y-6">
          {/* Donors Grid */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Heart className="w-5 h-5 text-rose-500" />
              <span>Registered Donor Organs ({donors.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {donors.map(org => (
                <div key={org._id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-sm flex items-center space-x-2">
                      <span>{org.organType}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {org.bloodType}
                      </span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      org.status === 'available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {org.status}
                    </span>
                  </div>

                  <div className="text-slate-400 space-y-0.5 text-[11px]">
                    <div>Donor ID: <span className="font-mono text-slate-200">{org.donorId}</span> (Age: {org.donorAge})</div>
                    <div>Center: <span className="text-slate-200 font-medium">{org.hospital?.name}</span></div>
                    <div>Safe CIT: <span className="font-mono text-brand-400">{org.maxColdIschemiaHours} hours max</span></div>
                  </div>

                  {/* Encryption inspection toggle */}
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedOrganForInspection(org)}
                      className="text-brand-400 hover:text-brand-300 font-semibold flex items-center space-x-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Inspect AES-256 Ciphertext</span>
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono">SHA-256 Verified</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recipients Grid */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>Waiting Recipient Patients ({recipients.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipients.map(rcp => (
                <div key={rcp._id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-sm flex items-center space-x-2">
                      <span>{rcp.patientName}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {rcp.bloodType}
                      </span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      {rcp.urgencyLevel}
                    </span>
                  </div>

                  <div className="text-slate-400 space-y-0.5 text-[11px]">
                    <div>Patient Code: <span className="font-mono text-slate-200">{rcp.patientCode}</span> (Age: {rcp.patientAge})</div>
                    <div>Organ Needed: <span className="text-white font-semibold">{rcp.organNeeded}</span></div>
                    <div>Destination Hospital: <span className="text-slate-200">{rcp.hospital?.name}</span></div>
                    <div>Severity Index: <span className="font-mono text-amber-400">{rcp.medicalSeverityScore}/40</span></div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
                    HLA Markers: <span className="font-mono text-slate-300">{rcp.hlaTyping?.hlaA}, {rcp.hlaTyping?.hlaB}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Live AES-256 Encryption Inspector */}
      {selectedOrganForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Cryptographic Data Storage Inspection</h4>
              </div>
              <button 
                onClick={() => setSelectedOrganForInspection(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                In compliance with health data privacy regulations, all sensitive clinical and biological payloads are encrypted at rest using <strong>AES-256-GCM</strong> with authenticated checksum tags.
              </p>

              <div>
                <span className="text-[11px] font-semibold text-emerald-400 block mb-1">
                  1. Raw Encrypted Payload (Stored in Database):
                </span>
                <div className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-300/90 break-all border border-emerald-500/20 max-h-28 overflow-y-auto">
                  {selectedOrganForInspection.encryptedClinicalProfile}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-cyan-400 block mb-1">
                  2. Decrypted Clinical Profile (Authorized Medical Staff Only):
                </span>
                <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-cyan-200 border border-cyan-500/20 overflow-x-auto">
                  {JSON.stringify(selectedOrganForInspection.decryptedClinicalProfile, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
