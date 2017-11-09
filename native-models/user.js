var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = new mongoose.Schema({
  createdAt: {type: Date, default: Date.now()},
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

userSchema.pre('save', function(next) {
  var user = this;
  var SALT_FACTOR = 5;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('User', userSchema);