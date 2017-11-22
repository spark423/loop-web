var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = new mongoose.Schema({
  createdAt: {type: Date, default: Date.now},
  username: {type: String, lowercase: true, unique: true, required: true},
  password: {type: String, required: true},
  firstName: {type: String},
  lastName: {type: String},
  major: [{type: String}],
  classYear: {type: Number},
  description: {type: String},
  adminGroups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
  joinedGroups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
  posts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}],
  followingPosts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}],
  subscribedBoards: [{type: mongoose.Schema.Types.ObjectId, ref: 'Board'}],
  attendedEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  notifications: [{type: mongoose.Schema.Types.ObjectId, ref: 'Notification'}],
  resetPasswordToken: {type: String},
  resetPasswordExpires: {type: Date}
});

// Define methods ====================================================================================================================================================================
userSchema.methods.hashPassword = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validatePassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('User', userSchema);
