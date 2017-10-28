var mongoose = require('mongoose');

// Define schema =====================================================================================================================================================================
var eventSchema = mongoose.Schema({
  postedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  board: {type: mongoose.Schema.Types.ObjectId, ref: 'Board'},
  name: {type: String},
  createdAt: {type: Date, default: Date.now},
  date: {type: Date},
  startTime: {type: String},
  endTime: {type: String},
  location: {type: String},
  text: {type: String},
  images: [{type: String}],
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  attendees: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
})

// Define methods ====================================================================================================================================================================

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Event', eventSchema);
