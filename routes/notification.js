var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group')
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Challenge = require('../models/challenge')
var Notification = require('../models/notification')

router.get('/notifications', function(req, res) {
	User.findById(req.user._id).populate('notifications').exec(function(error, user) {
		if (error)
			throw error;
	    res.render('notifications', {notifications: user.notifications})
	})
})

module.exports = router;