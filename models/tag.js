var mongoose = require('mongoose');

var tagSchema =  new mongoose.Schema({
  name: {type: String},
  followers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  numberContent: {type: Number}
});

module.exports = mongoose.model('Tag', tagSchema);
