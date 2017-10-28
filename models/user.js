var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
	admin: {type: Boolean, default: false},
	username: {type: String, required: true},
	password: {type: String, required: true},
	firstName: {type: String, required: true},
	preferredName: {type: String},
	lastName: {type: String, required: true},
	major: {type: String},
	classYear: {type: Number},	
	description: {type: String},
	adminGroups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
	joinedGroups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
	hiddenGroups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],	
	subscribedBoards: [{type: mongoose.Schema.Types.ObjectId, ref: 'Board'}],
	posts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}],
	createdEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
	attendedEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],	
	suggestedChallenges: [{type: mongoose.Schema.Types.ObjectId, ref: 'Challenge'}],
	acceptedChallenges: [{type: mongoose.Schema.Types.ObjectId, ref: 'Challenge'}],
	hiddenChallenges: [{type: mongoose.Schema.Types.ObjectId, ref: 'Challenge'}],
	requests: [{type: mongoose.Schema.Types.ObjectId, ref: 'Request'}],
	notifications: [{type: mongoose.Schema.Types.ObjectId, ref: 'Notification'}],
	comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]
})

// Define methods ====================================================================================================================================================================
userSchema.methods.hashPassword = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validatePassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('User', userSchema);