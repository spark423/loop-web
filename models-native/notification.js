var mongoose = require('mongoose');

var notificationSchema = new mongoose.Schema({
	type: {type: String},
	message: {type: String},
	routeID: {
		kind: String,
		item: { type: mongoose.Schema.Types.ObjectId, refPath: 'source.kind' }
	}
});

module.exports = mongoose.model('Notification', notificationSchema);