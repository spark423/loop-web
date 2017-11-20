var mongoose = require('mongoose');

var groupSchema = new mongoose.Schema({
  createdAt: {type: Date, default: Date.now()},
  name: {type: String, required: true},
  description: {type: String},
  admin: {type: String},
  archived: {type: Boolean, default: false},
  members: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
});



// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Group', groupSchema);
