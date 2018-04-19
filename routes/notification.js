var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group')
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Notification = require('../models/notification')
var moment = require('moment-timezone')

function swap(items, firstIndex, secondIndex){
  var temp = items[firstIndex];
  items[firstIndex] = items[secondIndex];
  items[secondIndex] = temp;
}

function partition(items, left, right) {
  var pivot   = items[Math.floor((right + left) / 2)],
      i       = left,
      j       = right;
    while (i <= j) {
        while (items[i].createdAt < pivot.createdAt) {
            i++;
        }
        while (items[j].createdAt > pivot.createdAt) {
            j--;
        }
        if (i <= j) {
            swap(items, i, j);
            i++;
            j--;
        }
    }
    return i;
}

function quickSort(items, left, right) {
    var index;
    if (items.length > 1) {
        index = partition(items, left, right);
        if (left < index - 1) {
            quickSort(items, left, index - 1);
        }
        if (index < right) {
            quickSort(items, index, right);
        }
    }
    return items;
}

//Load notifications on topbar
router.get('/notifications', function(req, res) {
	if(req.user) {
		User.findById(req.user._id).populate('notifications').exec(function(err, user) {
			if (err) {
				throw err;
			} else {
				let notifications = user.notifications.map(function(notification) {
					return {"type": notification.type, "createdAt": moment(notification.createdAt), "message": notification.message, "routeID": notification.routeID}
				})
				res.send({length: notifications.length, notifications: notifications, admin: req.user.admin});
			}
		})
	} else {
		res.redirect('/');
	}
})

//Render page for all notifications
router.get('/all-notifications', function(req, res) {
  if(req.user && !req.user.verified) {
    res.redirect('/not-verified');
  }
  else if(req.user) {
		User.findById(req.user._id).populate('notifications').exec(function(err, user) {
			if (err) {
				throw err;
			} else {
				let notifications = user.notifications.map(function(notification) {
					return {"type": notification.type, "createdAt": moment(notification.createdAt).utc().tz("America/New_York").format('MMMM D, YYYY, h:mm a'), "formatCreated": moment(notification.createdAt).utc().tz("America/New_York").format('MMMM D, YYYY'), "message": notification.message, "routeID": notification.routeID}
				})
				let sortedNotifications = quickSort(notifications, 0, notifications.length - 1).reverse();
				res.render('notifications', {notifications: sortedNotifications, admin: req.user.admin, helpers: {
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
	} else {
		res.redirect('/');
	}
})

module.exports = router;
