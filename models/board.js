var mongoose = require('mongoose');

var boardSchema = new mongoose.Schema({
  name: {type: String, required: true},
  description: {type: String},
  create: {type: Boolean},
  unsubscribable: {type: Boolean},
  private: {type: Boolean},
  archive: {type: Boolean, default: false},
  active: {type: Boolean, default: true},
  notifications: [{type: mongoose.Schema.Types.ObjectId, ref: 'Notification'}],
  contents: [{
    kind: String,
    item: { type: mongoose.Schema.Types.ObjectId, refPath: 'contents.kind' }
  }]
})

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Board', boardSchema);
