const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const DonorOrgan = require('../models/DonorOrgan');
const RecipientRequest = require('../models/RecipientRequest');
const Match = require('../models/Match');
const TransitLog = require('../models/TransitLog');
const AuditRecord = require('../models/AuditRecord');

/**
 * Get comprehensive platform metrics & command center stats
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [
      hospitalCount,
      availableOrgansCount,
      waitingRecipientsCount,
      activeTransitsCount,
      completedTransplantsCount,
      recentAlerts,
      recentAudits
    ] = await Promise.all([
      Hospital.countDocuments(),
      DonorOrgan.countDocuments({ status: 'available' }),
      RecipientRequest.countDocuments({ status: 'waiting' }),
      TransitLog.countDocuments({ status: { $in: ['dispatched', 'in_corridor', 'approaching_destination'] } }),
      Match.countDocuments({ status: 'delivered' }),
      Match.find({ status: { $in: ['alerted', 'accepted'] } })
        .populate('donorOrgan')
        .populate('recipientRequest')
        .populate('donorHospital')
        .populate('recipientHospital')
        .sort({ updatedAt: -1 })
        .limit(5),
      AuditRecord.find()
        .sort({ auditIndex: -1 })
        .limit(6)
    ]);

    // Breakdown by organ type
    const organBreakdown = await DonorOrgan.aggregate([
      { $group: { _id: '$organType', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        hospitals: hospitalCount,
        availableOrgans: availableOrgansCount,
        waitingRecipients: waitingRecipientsCount,
        activeGreenCorridors: activeTransitsCount,
        completedTransplants: completedTransplantsCount,
        organBreakdown,
        recentAlerts,
        recentAudits
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
