var mongoose = require('mongoose');

var groupSchema = new mongoose.Schema({
  createdAt: {type: Date, default: Date.now},
  name: {type: String, required: true},
  description: {type: String},
  admin: {type: String},
  archive: {type: Boolean, default: false},
  active: {type: Boolean, default: true},
  members: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  tags: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tag'}]
});

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Group', groupSchema);
