var mongoose = require('mongoose');

// Define schema =====================================================================================================================================================================
var boardSchema = mongoose.Schema({
  name: {type: String, required: true},
  description: {type: String, required: true},
  subscribers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  posts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}],
  events: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
  challenges: [{type: mongoose.Schema.Types.ObjectId, ref: 'Challenge'}]
})

// Define methods ====================================================================================================================================================================

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Board', boardSchema);