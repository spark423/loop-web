var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// Define schema =====================================================================================================================================================================
var groupSchema = mongoose.Schema({
	name: {type: String, required: true},
	description: {type: String},
	admin: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	members: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	hiddenMembers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	posts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}],
	createdEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
	attendedEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
	suggestedChallenges: [{type: mongoose.Schema.Types.ObjectId, ref: 'Challenge'}],
	acceptedChallenges: [{type: mongoose.Schema.Types.ObjectId, ref: 'Challenge'}],
	hiddenChallenges: [{type: mongoose.Schema.Types.ObjectId, ref: 'Challenge'}],
	comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]
})

// Define methods ====================================================================================================================================================================


// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Group', groupSchema);
