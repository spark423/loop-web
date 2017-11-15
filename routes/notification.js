var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group')
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Notification = require('../models/notification')
var moment = require('moment')

router.get('/notifications', function(req, res) {
	User.findById(req.user._id).populate('notifications').exec(function(err, user) {
		if (err) {
			throw err;
		} else {
			let notifications = user.notifications.map(function(notification) {
				return {"type": notification.type, "createdAt": moment(notification.createdAt).format('MMMM D, YYYY, h:mm a'), "message": notification.message, "routeID": notification.routeID}
			})
			res.send({length: notifications.length, notifications: notifications});
		}
	})
})

router.get('/all-notifications', function(req, res) {
	User.findById(req.user._id).populate('notifications').exec(function(err, user) {
		if (err) {
			throw err;
		} else {
			let notifications = user.notifications.map(function(notification) {
				return {"type": notification.type, "createdAt": moment(notification.createdAt).format('MMMM D, YYYY, h:mm a'), "message": notification.message, "routeID": notification.routeID}
			})
			res.render('notifications', {notifications: notifications, helpers: {
					compare: function(lvalue, rvalue, options) {
						if (arguments.length < 3)
								throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

						var operator = options.hash.operator || "==";

						var operators = {
								'==':       function(l,r) { return l == r; },
								'===':      function(l,r) { return l === r; },
								'!=':       function(l,r) { return l != r; },
								'<':        function(l,r) { return l < r; },
								'>':        function(l,r) { return l > r; },
								'<=':       function(l,r) { return l <= r; },
								'>=':       function(l,r) { return l >= r; },
								'typeof':   function(l,r) { return typeof l == r; }
						}

						if (!operators[operator])
								throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

						var result = operators[operator](lvalue,rvalue);

						if( result ) {
								return options.fn(this);
						} else {
								return options.inverse(this);
						}
					}
				}});
		}
	})
})
/*
router.get('/notifications', function(req, res) {
	User.findById(req.user._id).populate('notifications').exec(function(error, user) {
		if (error)
			throw error;
	    res.render('notifications', {notifications: user.notifications})
	})
})*/

module.exports = router;
