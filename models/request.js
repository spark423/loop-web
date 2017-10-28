var mongoose = require('mongoose');

var requestSchema = mongoose.Schema({
	sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	preferredName: {type: String}
})

// Define methods ====================================================================================================================================================================

// Export schema =====================================================================================================================================================================
module.exports = mongoose.model('Request', requestSchema);