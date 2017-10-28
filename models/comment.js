var mongoose = require('mongoose');

// Define schema =====================================================================================================================================================================
var commentSchema = mongoose.Schema({
  postedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  post: {type: mongoose.Schema.Types.ObjectId, ref: 'Post'},
  event: {type: mongoose.Schema.Types.ObjectId, ref: 'Event'},
  challenge: {type: mongoose.Schema.Types.ObjectId, ref: 'Challenge'},
  upperComment: {type: mongoose.Schema.Types.ObjectId, ref: 'Comment'},
  createdAt: {type: Date, default: Date.now},
  text: {type: String, required: true},
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]
})

// Define methods ====================================================================================================================================================================

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Comment', commentSchema);