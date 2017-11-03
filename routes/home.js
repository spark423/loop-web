var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var moment = require('moment')
var Post = require('../models/post');
var Event = require('../models/event');

/*Top 3:
1. Total number of Posts this week
2. The total Events this week
3. Total number of Follows this week
Bottom 3:
4. Total number of Groups
5. Total number of Profiles
6. Total number of Board Subscriptions*/
router.get('/home', function(req, res) {
	if(req.user) {
		var post_counter = 0;
		var event_counter = 0;
		var follow_counter = 0;
		var start = new Date(moment().startOf('week'));

		Board.find({}, function(err, boards) {
			if (err) throw err;
			var board_counter = 0;
			for(var i=0; i<boards.length; i++) {
				board_counter+=boards[i].subscribers.length;
			}
			Post.find({}, function(err, posts) {
				for(var i=0; i<posts.length; i++) {
					if(posts[i].createdAt > start) {
						post_counter++;
					}
				}
				Event.find({}, function(err, events) {
					for(var i=0; i<events.length; i++) {
						if(events[i].createdAt > start) {
							event_counter++;
						}
					}
			Group.find({}, function(err, groups) {
				if (err) throw err;
				var group_counter = groups.length;
				User.find({}, function(err, users) {
					if (err) throw err;
					var user_counter = users.length;
					res.render('home', {user: req.user, date: moment(Date.now()).format('dddd, MMMM D, YYYY'), boards: board_counter, groups: group_counter, users: user_counter, posts: post_counter, events: event_counter, follows: follow_counter});
				})
			})
			})
		})
	})
}	else {
		res.render('index');
	}
})

module.exports = router;
