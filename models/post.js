var mongoose = require('mongoose');

var postSchema = new mongoose.Schema({
  createdAt: {type: Date, default: Date.now},
  postedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  board: {type: mongoose.Schema.Types.ObjectId, ref: 'Board'},
  postingGroup: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
  postingOffice: {type: mongoose.Schema.Types.ObjectId, ref: 'Office'},
  onGroupPage: {type: Boolean, default: false},
  onOfficePage: {type: Boolean, default: false},
  title: {type: String},
  text: {type: String},
  flagged: {type: Boolean, default: false},
  archive: {type: Boolean, default: false},
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  followers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  tags: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tag'}]
});



// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Post', postSchema);
