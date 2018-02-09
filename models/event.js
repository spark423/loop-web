var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
  EMSid: {type: String},
  createdAt: {type: Date, default: Date.now},
  contact: {type: String},
  board: {type: mongoose.Schema.Types.ObjectId, ref: 'Board'},
  postingGroup: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
  postingOffice: {type: mongoose.Schema.Types.ObjectId, ref: 'Office'},
  onGroupPage: {type: Boolean, default: false},
  onOfficePage: {type: Boolean, default: false},
  title: {type: String},
  date: {type: Date},
  startTime: {type: Date},
  endTime: {type: Date},
  location: {type: String},
  description: {type: String},
  archive: {type: Boolean, default: false},
  flagged: {type: Boolean, default: false},
  attendees: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  tags: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tag'}]
});



// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Event', eventSchema);
