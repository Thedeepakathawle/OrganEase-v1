export const API_BASE = import.meta.env.VITE_API_BASE || 'https://organease-v1.onrender.com/api';

function getHeaders() {
  const token = localStorage.getItem('organ_ease_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const api = {
  // Auth & Hospitals
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return res.json();
  },

  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return res.json();
  },

  getHospitals: async () => {
    const res = await fetch(`${API_BASE}/auth/hospitals`);
    return res.json();
  },

  registerHospital: async (hospitalData) => {
    const res = await fetch(`${API_BASE}/auth/hospitals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(hospitalData)
    });
    return res.json();
  },

  // Organs & Recipients
  getDonors: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/organs/donors?${query}`);
    return res.json();
  },

  submitDonorOrgan: async (data) => {
    const res = await fetch(`${API_BASE}/organs/donors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getRecipients: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/organs/recipients?${query}`);
    return res.json();
  },

  submitRecipientRequest: async (data) => {
    const res = await fetch(`${API_BASE}/organs/recipients`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Matching Engine
  triggerMatching: async (donorOrganId) => {
    const res = await fetch(`${API_BASE}/matching/trigger/${donorOrganId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  getMatches: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/matching/matches?${query}`);
    return res.json();
  },

  getMatchDetail: async (matchId) => {
    const res = await fetch(`${API_BASE}/matching/matches/${matchId}`);
    return res.json();
  },

  acceptMatch: async (matchId) => {
    const res = await fetch(`${API_BASE}/matching/accept/${matchId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Transit & Green Corridor
  dispatchTransit: async (matchId) => {
    const res = await fetch(`${API_BASE}/transit/dispatch/${matchId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  getTransitStatus: async (matchId) => {
    const res = await fetch(`${API_BASE}/transit/${matchId}`);
    return res.json();
  },

  simulateTransitStep: async (matchId, stepIncrement = 18) => {
    const res = await fetch(`${API_BASE}/transit/simulate-step/${matchId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ stepIncrement })
    });
    return res.json();
  },

  getActiveTransits: async () => {
    const res = await fetch(`${API_BASE}/transit`);
    return res.json();
  },

  // Delivery Verification & Compliance Records
  verifyDelivery: async (verificationData) => {
    const res = await fetch(`${API_BASE}/verification/verify-delivery`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(verificationData)
    });
    return res.json();
  },

  getAuditRecords: async () => {
    const res = await fetch(`${API_BASE}/verification/records`);
    return res.json();
  },

  getCertificate: async (certificateId) => {
    const res = await fetch(`${API_BASE}/verification/certificate/${certificateId}`);
    return res.json();
  },

  // Platform Analytics & Demo Seed
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE}/analytics/dashboard-stats`);
    return res.json();
  },

  reseedDatabase: async () => {
    const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
    return res.json();
  }
};
