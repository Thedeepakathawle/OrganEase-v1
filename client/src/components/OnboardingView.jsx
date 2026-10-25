import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  UserCheck, 
  Lock, 
  MapPin, 
  Phone, 
  Award, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function OnboardingView() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('user'); // 'user' or 'hospital'
  
  // Registration form states
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'transplant_surgeon',
    hospitalId: '',
    medicalLicenseId: '',
    phone: ''
  });

  const [hospitalFormData, setHospitalFormData] = useState({
    name: '',
    registrationId: '',
    licenseNumber: '',
    type: 'Transplant Center',
    city: '',
    state: '',
    address: '',
    latitude: 40.7128,
    longitude: -74.0060,
    contactEmail: '',
    emergencyHotline: '',
    transplantCapabilities: ['Heart', 'Kidney', 'Liver']
  });

  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHospitals = async () => {
    try {
      const res = await api.getHospitals();
      if (res.success) {
        setHospitals(res.hospitals);
        if (res.hospitals.length > 0 && !userFormData.hospitalId) {
          setUserFormData(prev => ({ ...prev, hospitalId: res.hospitals[0]._id }));
        }
      }
    } catch (err) {
      console.error('Fetch hospitals error:', err);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleUserRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.register(userFormData);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Identity verified and user onboarded with role-based access privileges!' });
        setUserFormData({
          name: '',
          email: '',
          password: '',
          role: 'transplant_surgeon',
          hospitalId: hospitals[0]?._id || '',
          medicalLicenseId: '',
          phone: ''
        });
      } else {
        setFeedback({ type: 'error', message: res.message || 'Registration failed.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHospitalRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        ...hospitalFormData,
        coordinates: {
          latitude: Number(hospitalFormData.latitude),
          longitude: Number(hospitalFormData.longitude)
        }
      };
      const res = await api.registerHospital(payload);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Hospital facility accredited, verified, and mapped onto the OrganEase green-corridor network.' });
        fetchHospitals();
        setHospitalFormData({
          name: '',
          registrationId: '',
          licenseNumber: '',
          type: 'Transplant Center',
          city: '',
          state: '',
          address: '',
          latitude: 40.7128,
          longitude: -74.0060,
          contactEmail: '',
          emergencyHotline: '',
          transplantCapabilities: ['Heart', 'Kidney', 'Liver']
        });
      } else {
        setFeedback({ type: 'error', message: res.message || 'Hospital onboarding failed.' });
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
            <ShieldCheck className="w-4 h-4" />
            <span>Pillar 1: MERN Authentication & Identity Validation</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Patient & Hospital Secure Onboarding</h2>
          <p className="text-xs text-slate-400">
            Enforces strict Role-Based Access Control (RBAC) and cryptographic entity validation to guarantee HIPAA/GDPR health compliance.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 border border-slate-700/80 rounded-xl p-1 text-xs">
          <button
            onClick={() => { setActiveSubTab('user'); setFeedback(null); }}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold transition ${
              activeSubTab === 'user' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Medical Team & Patient Reg</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('hospital'); setFeedback(null); }}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold transition ${
              activeSubTab === 'hospital' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hospital Accreditation</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
            : 'bg-red-500/10 text-red-300 border border-red-500/30'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Container (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {activeSubTab === 'user' ? (
            <form onSubmit={handleUserRegister} className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-brand-400" />
                <span>Onboard Medical Personnel or Patient</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jordan Hayes, MD"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Email (Auth0 / Institutional)</label>
                  <input
                    type="email"
                    required
                    placeholder="jordan.hayes@hopkinssurgery.org"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Secure Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Role / Privilege Level</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="transplant_surgeon">Transplant Surgeon (High Clearance)</option>
                    <option value="coordinator">Organ Procurement Coordinator</option>
                    <option value="hospital_admin">Hospital Admin & Dispatch Command</option>
                    <option value="patient_donor">Patient / Donor Coordinator</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Associated Hospital Facility</label>
                  <select
                    value={userFormData.hospitalId}
                    onChange={(e) => setUserFormData({ ...userFormData, hospitalId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  >
                    {hospitals.map(h => (
                      <option key={h._id} value={h._id}>{h.name} ({h.city})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Medical License / National Provider ID</label>
                  <input
                    type="text"
                    placeholder="e.g. NPI-892401928"
                    value={userFormData.medicalLicenseId}
                    onChange={(e) => setUserFormData({ ...userFormData, medicalLicenseId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-brand-600/20 transition"
                >
                  {isSubmitting ? 'Validating Identity...' : 'Complete Secure Verification & Register'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleHospitalRegister} className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-brand-400" />
                <span>Onboard Hospital / Procurement Organization</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-medium block mb-1">Hospital / Medical Center Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Memorial Sloan Kettering Transplant Wing"
                    value={hospitalFormData.name}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Facility Type</label>
                  <select
                    value={hospitalFormData.type}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Transplant Center">Transplant Center</option>
                    <option value="Organ Procurement Organization">Organ Procurement Organization</option>
                    <option value="Trauma Care Hospital">Level 1 Trauma Care Hospital</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Transplant Accreditation License</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TX-LIC-2026-99"
                    value={hospitalFormData.licenseNumber}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, licenseNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="Boston"
                    value={hospitalFormData.city}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, city: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">State / Province</label>
                  <input
                    type="text"
                    required
                    placeholder="MA"
                    value={hospitalFormData.state}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, state: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">GPS Latitude (For Transit Routing)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={hospitalFormData.latitude}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, latitude: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">GPS Longitude (For Transit Routing)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={hospitalFormData.longitude}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, longitude: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-medium block mb-1">24/7 Organ Procurement Emergency Hotline</label>
                  <input
                    type="text"
                    required
                    placeholder="+1-800-555-CORRIDOR"
                    value={hospitalFormData.emergencyHotline}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, emergencyHotline: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-brand-600/20 transition"
                >
                  {isSubmitting ? 'Accrediting Facility...' : 'Accredit & Map Hospital Facility'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Verified Network Directory (1 Col) */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Verified Transplant Network</h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Only verified medical centers with validated state licenses are permitted to submit encrypted organ requests.
            </p>

            <div className="space-y-3 pt-2">
              {hospitals.map((hosp) => (
                <div key={hosp._id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{hosp.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                    <MapPin className="w-3 h-3 text-brand-400" />
                    <span>{hosp.city}, {hosp.state}</span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-[10px]">{hosp.licenseNumber}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center space-x-1 pt-1">
                    <Phone className="w-3 h-3" />
                    <span>Emergency: {hosp.emergencyHotline}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
