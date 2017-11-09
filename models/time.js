var mongoose = require('mongoose');

var timeSchema = new mongoose.Schema({
  follows: [post: {type: mongoose.Schema.Types.ObjectId, refPath: 'Post'}, user: {type: mongoose.Schema.Types.ObjectId, refPath: 'User'}, createdAt: {type: Date, default: Date.now()}],
  subscriptions: [board: {type: mongoose.Schema.Types.ObjectId, refPath: 'Board'}, user: {type: mongoose.Schema.Types.ObjectId, refPath: 'User'}, createdAt: {type: Date, default: Date.now()}],
})

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Time', timeSchema);
