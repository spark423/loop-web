var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = new mongoose.Schema({
  createdAt: {type: Date, default: Date.now},
  blocked: {type: Boolean},
  blockedBy: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  blocking: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  username: {type: String, lowercase: true, unique: true, required: true},
  password: {type: String, required: true},
  school: {type: String},
  firstName: {type: String},
  lastName: {type: String},
  major: [{type: String}],
  classYear: {type: Number},
  description: {type: String},
  admin: {type: Boolean},
  title: {type: String},
  division: {type: String},
  adminGroups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
  joinedGroups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
  viewBlockedGroups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
  postBlockedGroups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
  viewBlockedBoards: [{type: mongoose.Schema.Types.ObjectId, ref: 'Board'}],
  postBlockedBoards: [{type: mongoose.Schema.Types.ObjectId, ref: 'Board'}],
  office: [{type: mongoose.Schema.Types.ObjectId, ref: 'Office'}],
  posts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}],
  followingPosts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}],
  subscribedBoards: [{type: mongoose.Schema.Types.ObjectId, ref: 'Board'}],
  attendedEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  notifications: [{type: mongoose.Schema.Types.ObjectId, ref: 'Notification'}],
  resetPasswordToken: {type: String},
  resetPasswordExpires: {type: Date},
  tags: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tag'}]
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
