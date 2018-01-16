var mongoose = require('mongoose');

var notificationSchema = new mongoose.Schema({
	createdAt: {type: Date, default: Date.now},
	type: {type: String},
	message: {type: String},
	routeID: {
		kind: String,
		id: { type: mongoose.Schema.Types.ObjectId, refPath: 'source.kind' },
		boardId: {type: mongoose.Schema.Types.ObjectId, refPath: 'Board'}
	}
});

module.exports = mongoose.model('Notification', notificationSchema);
