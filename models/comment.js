var mongoose = require('mongoose');

var commentSchema = new mongoose.Schema({
  createdAt: {type: Date, default: Date.now()},
  postedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  source: {
    kind: String,
    item: { type: mongoose.Schema.Types.ObjectId, refPath: 'source.kind' }
  },
  text: {type: String},
  archived: {type: Boolean, default: false},
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]
});



// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Comment', commentSchema);
