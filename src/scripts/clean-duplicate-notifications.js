// Script to clean duplicate notifications from database
// Run with: node src/scripts/clean-duplicate-notifications.js

const mongoose = require('mongoose');
require('dotenv').config();

// Notification schema (simplified)
const notificationSchema = new mongoose.Schema({
  recipientId: { type: String, required: true },
  actorId: { type: String },
  actorName: { type: String },
  type: { type: String, required: true },
  data: { type: Object },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

async function cleanDuplicateNotifications() {
  try {
    console.log('🚀 Starting duplicate notification cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all notifications
    const allNotifications = await Notification.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${allNotifications.length} total notifications`);

    // Group by recipient and find duplicates
    const recipientGroups = {};
    
    for (const notification of allNotifications) {
      const recipientId = notification.recipientId;
      if (!recipientGroups[recipientId]) {
        recipientGroups[recipientId] = [];
      }
      recipientGroups[recipientId].push(notification);
    }

    let totalDuplicatesRemoved = 0;

    for (const [recipientId, notifications] of Object.entries(recipientGroups)) {
      console.log(`\n👤 Processing ${notifications.length} notifications for user ${recipientId}`);
      
      const seen = new Set();
      const duplicatesToRemove = [];

      for (const notification of notifications) {
        // Create a key for similar notifications
        const similarKey = `${notification.type}-${notification.data?.taskId || ''}-${notification.data?.projectId || ''}-${notification.data?.spaceId || ''}-${notification.actorId || ''}-${Math.floor(new Date(notification.createdAt).getTime() / 10000)}`; // 10 second window
        
        if (seen.has(similarKey)) {
          duplicatesToRemove.push(notification._id);
          console.log(`  🔄 Marking duplicate: ${notification.type} - ${notification._id}`);
        } else {
          seen.add(similarKey);
        }
      }

      // Remove duplicates for this user
      if (duplicatesToRemove.length > 0) {
        const result = await Notification.deleteMany({
          _id: { $in: duplicatesToRemove }
        });
        
        console.log(`  ✅ Removed ${result.deletedCount} duplicates for user ${recipientId}`);
        totalDuplicatesRemoved += result.deletedCount;
      } else {
        console.log(`  ✅ No duplicates found for user ${recipientId}`);
      }
    }

    // Clean very old notifications (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldNotificationsResult = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`\n🧹 Removed ${oldNotificationsResult.deletedCount} old notifications (>30 days)`);

    // Final count
    const finalCount = await Notification.countDocuments();
    console.log(`\n📊 Final notification count: ${finalCount}`);
    console.log(`🎉 Cleanup complete! Removed ${totalDuplicatesRemoved} duplicates and ${oldNotificationsResult.deletedCount} old notifications`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanDuplicateNotifications();
