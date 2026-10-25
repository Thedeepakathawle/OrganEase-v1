import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  Clock, 
  Thermometer, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  MapPin, 
  Radio, 
  Truck, 
  Flame, 
  Compass, 
  ArrowRight 
} from 'lucide-react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import L from 'leaflet';

export default function TransitTrackerView({ onProceedToVerification }) {
  const { telemetry } = useSocket();
  const [activeTransits, setActiveTransits] = useState([]);
  const [selectedTransit, setSelectedTransit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stepping, setStepping] = useState(false);
  const [stepFeedback, setStepFeedback] = useState(null);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const corridorPolylineRef = useRef(null);

  const fetchTransits = async () => {
    try {
      const res = await api.getActiveTransits();
      if (res.success && res.activeTransits.length > 0) {
        setActiveTransits(res.activeTransits);
        if (!selectedTransit) {
          setSelectedTransit(res.activeTransits[0]);
        }
      }
    } catch (err) {
      console.error('Fetch transits error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransits();
    const interval = setInterval(fetchTransits, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update selected transit when WebSocket telemetry arrives
  useEffect(() => {
    if (telemetry?.transitLog && selectedTransit?._id === telemetry.transitLog._id) {
      setSelectedTransit(telemetry.transitLog);
    }
  }, [telemetry]);

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !selectedTransit) return;

    const origin = selectedTransit.originCoordinates || { latitude: 40.7423, longitude: -73.9748 };
    const dest = selectedTransit.destinationCoordinates || { latitude: 39.9502, longitude: -75.1932 };
    const currentLoc = selectedTransit.currentLocation || origin;

    if (!leafletMapRef.current) {
      // Create Leaflet map
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([currentLoc.latitude, currentLoc.longitude], 8);

      // Dark theme OpenStreetMap tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // Origin Icon (Donor Hospital)
      const donorIcon = L.divIcon({
        className: 'custom-donor-icon',
        html: `<div style="background:#10b981; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:12px; border:2px solid white; box-shadow:0 0 10px #10b981;">H1</div>`,
        iconSize: [28, 28]
      });
      L.marker([origin.latitude, origin.longitude], { icon: donorIcon })
        .addTo(map)
        .bindPopup(`<b>Donor Procurement:</b><br>${selectedTransit.donorHospital?.name || 'Metro NY'}`);

      // Destination Icon (Recipient Hospital)
      const recipientIcon = L.divIcon({
        className: 'custom-recipient-icon',
        html: `<div style="background:#ef4444; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:12px; border:2px solid white; box-shadow:0 0 10px #ef4444;">H2</div>`,
        iconSize: [28, 28]
      });
      L.marker([dest.latitude, dest.longitude], { icon: recipientIcon })
        .addTo(map)
        .bindPopup(`<b>Recipient Destination:</b><br>${selectedTransit.recipientHospital?.name || 'St. Jude PA'}`);

      // Vehicle Marker (Ambulance / Chopper)
      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-icon',
        html: `<div style="background:#06b6d4; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:16px; border:3px solid white; box-shadow:0 0 15px #06b6d4; animation:pulse 1.5s infinite;">🚑</div>`,
        iconSize: [34, 34]
      });
      const vehicleMarker = L.marker([currentLoc.latitude, currentLoc.longitude], { icon: vehicleIcon }).addTo(map);
      vehicleMarkerRef.current = vehicleMarker;

      // Green Corridor Polyline
      const waypoints = selectedTransit.waypoints || [];
      const latlngs = waypoints.length > 0 
        ? waypoints.map(w => [w.latitude, w.longitude])
        : [[origin.latitude, origin.longitude], [dest.latitude, dest.longitude]];

      const polyline = L.polyline(latlngs, {
        color: '#10b981',
        weight: 5,
        opacity: 0.85,
        dashArray: '10, 8'
      }).addTo(map);
      corridorPolylineRef.current = polyline;

      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      leafletMapRef.current = map;
    } else {
      // Update vehicle marker position smoothly
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setLatLng([currentLoc.latitude, currentLoc.longitude]);
      }
    }
  }, [selectedTransit]);

  const handleSimulateStep = async () => {
    if (!selectedTransit) return;
    setStepping(true);
    setStepFeedback(null);
    try {
      const res = await api.simulateTransitStep(selectedTransit.match._id || selectedTransit.match);
      if (res.success) {
        setSelectedTransit(res.transitLog);
        setStepFeedback(res.message);
      }
    } catch (err) {
      console.error('Simulate step error:', err);
    } finally {
      setStepping(false);
    }
  };

  const remainingHours = selectedTransit ? (selectedTransit.remainingCitMinutes / 60).toFixed(1) : 3.2;
  const elapsedHours = selectedTransit ? (selectedTransit.elapsedCitMinutes / 60).toFixed(1) : 0.8;
  const maxHours = selectedTransit?.maxCitHours || 4;
  const citRatio = selectedTransit ? (selectedTransit.remainingCitMinutes / (maxHours * 60)) : 0.8;

  // Viability color
  let viabilityBadgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  let viabilityGaugeBg = 'bg-emerald-500';
  if (citRatio < 0.25) {
    viabilityBadgeColor = 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse';
    viabilityGaugeBg = 'bg-red-500';
  } else if (citRatio < 0.50) {
    viabilityBadgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    viabilityGaugeBg = 'bg-amber-500';
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Navigation className="w-4 h-4 animate-spin" />
            <span>Pillar 5: Transit Tracking & Cold Ischemia Time Optimization</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Live Green-Corridor Dispatch & CIT Radar</h2>
          <p className="text-xs text-slate-400">
            Real-time GPS breadcrumbs, police green-corridor coordination, medical container temperature telemetry, and organ viability countdown.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSimulateStep}
            disabled={stepping || selectedTransit?.status === 'delivered'}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center space-x-2 transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{stepping ? 'Advancing GPS...' : 'Simulate GPS Advance (+18%)'}</span>
          </button>

          {selectedTransit?.status === 'arrived' && (
            <button
              onClick={() => onProceedToVerification && onProceedToVerification(selectedTransit.match)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2 animate-bounce"
            >
              <span>Verify Organ Handover</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {stepFeedback && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 flex items-center space-x-2 font-medium">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>{stepFeedback}</span>
        </div>
      )}

      {/* Main Grid: Interactive Map (2 cols) & Telemetry HUD (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
          {/* Map Top Bar */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-xs z-10">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-white font-mono">
                {selectedTransit?.vehicleCallsign || 'MED-CORRIDOR-HEART-01'}
              </span>
              <span className="text-slate-400">• {selectedTransit?.vehicleType}</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {selectedTransit?.trafficClearanceStatus || 'Green Corridor Police Clearance Active'}
            </div>
          </div>

          {/* Leaflet Map DOM Element */}
          <div ref={mapContainerRef} className="flex-1 w-full bg-slate-950" />

          {/* Map Bottom Status Bar */}
          <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-3 text-slate-300">
              <span>Velocity: <strong className="text-white">{selectedTransit?.speedKmh || 95} km/h</strong></span>
              <span>•</span>
              <span>Progress: <strong className="text-cyan-400">{selectedTransit?.progressPercent || 48}%</strong></span>
            </div>
            <div className="text-slate-400 text-[11px]">
              GPS Waypoints: {selectedTransit?.waypoints?.filter(w => w.passed).length || 3}/{selectedTransit?.waypoints?.length || 6} Cleared
            </div>
          </div>
        </div>

        {/* Telemetry HUD & CIT Degradation Gauge (1 Col) */}
        <div className="space-y-4">
          {/* Cold Ischemia Time Dynamic Countdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-brand-400" />
                <h3 className="text-sm font-bold text-white">Cold Ischemia Time (CIT)</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${viabilityBadgeColor}`}>
                {selectedTransit?.viabilityStatus || 'OPTIMAL'}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest block">Safe Viability Remaining</span>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {remainingHours} <span className="text-sm font-normal text-slate-400">hours</span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                Elapsed: {elapsedHours}h / Maximum Viable: {maxHours}.0h
              </span>
            </div>

            {/* Viability Gauge Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Viability Index</span>
                <span>{Math.round(citRatio * 100)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${viabilityGaugeBg}`} 
                  style={{ width: `${Math.max(5, Math.min(100, citRatio * 100))}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Medical Cold-Box Sensor Telemetry */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Cold-Box Container Sensors</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-slate-400 text-[10px] block">Core Temperature:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {selectedTransit?.temperatureCelsius || 3.4}°C
                </span>
                <span className="text-[10px] text-slate-500 block">Safe: 2.0°C – 8.0°C</span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-slate-400 text-[10px] block">Container Battery:</span>
                <span className="text-xl font-black text-white font-mono flex items-center space-x-1">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>{selectedTransit?.batteryPercentage || 94}%</span>
                </span>
                <span className="text-[10px] text-emerald-400 block">Active Cooling</span>
              </div>
            </div>

            {/* Police Escort Officer */}
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 text-xs text-slate-300 space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Command Priority Clearance</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {selectedTransit?.dispatchOfficer || 'Officer J. Vance (Traffic Command Priority)'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
