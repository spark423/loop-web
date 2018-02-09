var mongoose = require('mongoose');

var officeSchema = new mongoose.Schema({
  name: {type: String, required: true},
  private: {type: Boolean, default: false},
  members: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  tags: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tag'}]
});

module.exports = mongoose.model('Office', officeSchema);
