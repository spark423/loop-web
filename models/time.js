var mongoose = require('mongoose');

var timeSchema = new mongoose.Schema({
  follows: [{createdAt: Date, post: {type: mongoose.Schema.Types.ObjectId, refPath: 'Post'}, user: {type: mongoose.Schema.Types.ObjectId, refPath: 'User'}}],
  subscriptions: [{createdAt: Date, board: {type: mongoose.Schema.Types.ObjectId, refPath: 'Board'}, user: {type: mongoose.Schema.Types.ObjectId, refPath: 'User'}}]
})

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Time', timeSchema);
