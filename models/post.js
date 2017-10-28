var mongoose = require('mongoose');

// Define schema =====================================================================================================================================================================
var postSchema = mongoose.Schema({
  title: {type: String},
  postedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  postingGroup: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
  board: {type: mongoose.Schema.Types.ObjectId, ref: 'Board'},
  createdAt: {type: Date, default: Date.now},
  text: {type: String, required: true},
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  images: [{type: String}]
})

// Define methods ====================================================================================================================================================================

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Post', postSchema);
