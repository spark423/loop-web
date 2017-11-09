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

		var post_percent = 0;
		var lastWeekPosts = 0;
		var thisWeekPosts = 0;

		var event_percent = 0;
		var lastWeekEvents = 0;
		var thisWeekEvents = 0;

		var follow_percent = 0;
		var lastWeekFollows = 0;
		var thisWeekFollows = 0;

		var group_percent = 0;
		var lastWeekGroups = 0;
		var thisWeekGroups = 0;

		var user_percent = 0;
		var lastWeekUsers = 0;
		var thisWeekUsers = 0;

		var subscriptions_percent = 0;
		var lastWeekSubscriptions = 0;
		var thisWeekSubscriptions = 0;

		var start = new Date(moment().startOf('week'));
		var lastWeek = new Date(moment().startOf('week').subtract(7, 'days'));
		var lastWeekToday = new Date(moment().subtract(7, 'days'));
		var today = new Date(moment());

		Board.find({}, function(err, boards) {
			if (err) throw err;
			var board_counter = 0;
			for(var i=0; i<boards.length; i++) {
				//board_counter+=boards[i].subscribers.length;
			}
			Post.find({}, function(err, posts) {
				for(var i=0; i<posts.length; i++) {
					if(posts[i].createdAt > start) {
						post_counter++;
					}
					if(posts[i].createdAt > lastWeek && posts[i].createdAt < lastWeekToday) {
						lastWeekPosts++;
					}
					if(posts[i].createdAt > start && posts[i].createdAt < today) {
						thisWeekPosts++;
					}
				}
				post_percent = ((thisWeekPosts-lastWeekPosts)/lastWeekPosts)*100;
				Event.find({}, function(err, events) {
					for(var i=0; i<events.length; i++) {
						if(events[i].createdAt > start) {
							event_counter++;
						}
						if(posts[i].createdAt > lastWeek && posts[i].createdAt < lastWeekToday) {
							lastWeekEvents++;
						}
						if(posts[i].createdAt > start && posts[i].createdAt < today) {
							thisWeekEvents++;
						}
					}
					event_percent = ((thisWeekEvents-lastWeekEvents)/lastWeekEvents)*100;
					Group.find({}, function(err, groups) {
						if (err) throw err;
						var group_counter = groups.length;
						User.find({}, function(err, users) {
							if (err) throw err;
							var user_counter = users.length;
							var subscription_counter = 0;
							for(var i=0; i<users.length; i++) {
								subscription_counter+=users[i].subscribedBoards.length;
							}
							res.render('home', {user: req.user, date: moment(Date.now()).format('dddd, MMMM D, YYYY'), boards: board_counter, groups: group_counter, users: user_counter, posts: post_counter, events: event_counter, follows: follow_counter, subscriptions: subscription_counter, post_percent: post_percent, event_percent: event_percent, follow_percent: follow_percent, group_percent: group_percent, user_percent: user_percent, subscriptions_percent: subscriptions_percent});
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
