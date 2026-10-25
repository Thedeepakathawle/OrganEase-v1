let ioInstance = null;

/**
 * Initialize Socket.IO with the HTTP server
 */
function initializeSocket(io) {
  ioInstance = io;
  
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    
    // Join hospital room or personal medical team channel
    socket.on('join_hospital', (hospitalId) => {
      socket.join(`hospital:${hospitalId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined hospital channel hospital:${hospitalId}`);
    });
    
    socket.on('join_match_stream', (matchId) => {
      socket.join(`match:${matchId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined match stream match:${matchId}`);
    });
    
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Emit an Emergency High-Priority Match Alert
 */
function broadcastEmergencyMatchAlert(matchData) {
  if (!ioInstance) return;
  
  const alertPayload = {
    type: 'HIGH_PRIORITY_ORGAN_MATCH',
    timestamp: new Date().toISOString(),
    matchId: matchData._id,
    matchScore: matchData.matchScore,
    organType: matchData.donorOrgan?.organType,
    urgencyLevel: matchData.recipientRequest?.urgencyLevel,
    donorHospitalName: matchData.donorHospital?.name,
    recipientHospitalName: matchData.recipientHospital?.name,
    distanceKm: matchData.distanceKm,
    estimatedTransitMinutes: matchData.estimatedTransitMinutes,
    safeCitMarginHours: matchData.safeCitMarginHours,
    deliveryKey: matchData.deliveryKey,
    scoreBreakdown: matchData.scoreBreakdown
  };
  
  // Broadcast to specific hospital rooms
  if (matchData.donorHospital?._id) {
    ioInstance.to(`hospital:${matchData.donorHospital._id}`).emit('emergency_alert', alertPayload);
  }
  if (matchData.recipientHospital?._id) {
    ioInstance.to(`hospital:${matchData.recipientHospital._id}`).emit('emergency_alert', alertPayload);
  }
  
  // Also broadcast to global alert stream for operations command center
  ioInstance.emit('global_emergency_alert', alertPayload);
  console.log(`[Socket.IO] Broadcasted EMERGENCY ALERT for match ${matchData._id} (Score: ${matchData.matchScore})`);
}

/**
 * Broadcast live GPS and medical cold-box telemetry during Green Corridor Transit
 */
function broadcastTransitTelemetry(matchId, telemetryData) {
  if (!ioInstance) return;
  
  ioInstance.to(`match:${matchId}`).emit('transit_telemetry', telemetryData);
  ioInstance.emit('global_transit_telemetry', { matchId, ...telemetryData });
}

/**
 * Broadcast Delivery Handshake & Verification Event
 */
function broadcastDeliveryVerified(verificationData) {
  if (!ioInstance) return;
  
  ioInstance.emit('delivery_verified', verificationData);
  console.log(`[Socket.IO] Broadcasted DELIVERY VERIFIED for Match ${verificationData.matchId}`);
}

module.exports = {
  initializeSocket,
  broadcastEmergencyMatchAlert,
  broadcastTransitTelemetry,
  broadcastDeliveryVerified
};
