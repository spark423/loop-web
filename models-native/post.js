var mongoose = require('mongoose');

var postSchema = new mongoose.Schema({  
  createdAt: {type: Date, default: Date.now()},
  postedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  board: {type: mongoose.Schema.Types.ObjectId, ref: 'Board'},
  title: {type: String},
  text: {type: String},
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  followers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
});



// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Post', postSchema);