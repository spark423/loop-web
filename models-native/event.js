var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({  
  createdAt: {type: Date, default: Date.now()},
  contact: {type: String},
  board: {type: mongoose.Schema.Types.ObjectId, ref: 'Board'},
  title: {type: String},
  date: {type: Date},
  startTime: {type: String},
  endTime: {type: String},
  location: {type: String},
  description: {type: String},
  attendees: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],  
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]
});



// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Event', eventSchema);