var mongoose = require('mongoose');

var notificationSchema = new mongoose.Schema({
	to: {type: mongoose.Schema.Types.ObjectId, refPath: 'User'},
	createdAt: {type: Date, default: Date.now},
	type: {type: String},
	message: {type: String},
	routeID: {
		kind: String,
		id: { type: mongoose.Schema.Types.ObjectId, refPath: 'source.kind' },
		boardId: {type: mongoose.Schema.Types.Mixed, default: ""}
	},
	read: {type: Boolean, default: false},
	readAt: {type: Date}
});

module.exports = mongoose.model('Notification', notificationSchema);
