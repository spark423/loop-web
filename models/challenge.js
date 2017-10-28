var mongoose = require('mongoose');

// Define schema =====================================================================================================================================================================
var challengeSchema = mongoose.Schema({
  postedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  board: {type: mongoose.Schema.Types.ObjectId, ref: 'Board'},
  name: {type: String},
  createdAt: {type: Date, default: Date.now},
  deadline: {type: Date, default: Date.now},
  text: {type: String, required: true},
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  acceptedUsers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
})

// Define methods ====================================================================================================================================================================

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Challenge', challengeSchema);