var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var moment = require('moment')
var Post = require('../models/post');
var Event = require('../models/event');
var Time = require('../models/time');
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
		var subscription_counter = 0;

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
				post_percent = Math.round(Number(((thisWeekPosts-lastWeekPosts)/lastWeekPosts)*100));
				if(post_percent==Infinity) {
					post_percent=0;
				}
				Event.find({}, function(err, events) {
					for(var i=0; i<events.length; i++) {
						if(events[i].createdAt > start) {
							event_counter++;
						}
						if(events[i].createdAt > lastWeek && events[i].createdAt < lastWeekToday) {
							lastWeekEvents++;
						}
						if(events[i].createdAt > start && events[i].createdAt < today) {
							thisWeekEvents++;
						}
					}
					event_percent = Math.round(Number(((thisWeekEvents-lastWeekEvents)/lastWeekEvents)*100));
					if(event_percent==Infinity) {
						event_percent=0;
					}
					Group.find({}, function(err, groups) {
						if (err) throw err;
						var group_counter = groups.length;
						for(var i=0; i<groups.length; i++) {
							if(groups[i].createdAt > lastWeek && groups[i].createdAt < lastWeekToday) {
								lastWeekGroups++;
							}
							if(groups[i].createdAt > start && groups[i].createdAt < today) {
								thisWeekGroups++;
							}
						}
						group_percent = Math.round(Number(((thisWeekGroups-lastWeekGroups)/lastWeekGroups)*100));
						if(group_percent==Infinity) {
							group_percent = 0;
						}
						User.find({}, function(err, users) {
							if (err) throw err;
							var user_counter = users.length;
							for(var i=0; i<users.length; i++) {
								if(users[i].createdAt > lastWeek && users[i].createdAt < lastWeekToday) {
									lastWeekUsers++;
								}
								if((users[i].createdAt > start) && (users[i].createdAt < today)) {
									thisWeekUsers++;
								}
							}
							user_percent = Math.round(Number(((thisWeekUsers-lastWeekUsers)/lastWeekUsers)*100));
							if(user_percent==Infinity) {
								user_percent=0;
							}
							for(var i=0; i<users.length; i++) {
								subscription_counter+=users[i].subscribedBoards.length;
							}
							Time.find({}, function(err, times) {
								for(var i=0; i<times.length; i++) {
									for(var j=0; j<times[i].follows.length; j++) {
										if(times[i].follows[j].createdAt > start) {
											follow_counter++;
										}
										if(times[i].follows[j].createdAt > lastWeek && times[i].follows[j].createdAt < lastWeekToday) {
											lastWeekFollows++;
										}
										if(times[i].follows[j].createdAt > start && times[i].follows[j].createdAt < today) {
											thisWeekFollows++;
										}
									}
									for(var j=0; j<times[i].subscriptions.length; j++) {
										if(times[i].subscriptions[j].createdAt > lastWeek && times[i].subscriptions[j].createdAt < lastWeekToday) {
											lastWeekSubscriptions++;
										}
										if(times[i].subscriptions[j].createdAt > start && times[i].subscriptions[j].createdAt < today) {
											thisWeekSubscriptions++;
										}
									}
								}
								follow_percent = Math.round(Number(((thisWeekFollows-lastWeekFollows)/lastWeekFollows)*100));
								subscriptions_percent = Math.round(Number(((thisWeekSubscriptions-lastWeekSubscriptions)/lastWeekSubscriptions)*100));
								if(follow_percent==Infinity) {
									follow_percent=0;
								}
								if(subscriptions_percent==Infinity) {
									subscriptions_percent=0;
								}
								res.render('home', {user: req.user, date: moment(Date.now()).local().format('dddd, MMMM D, YYYY'), groups: group_counter, users: user_counter, posts: post_counter, events: event_counter, follows: follow_counter, subscriptions: subscription_counter, post_percent: post_percent, event_percent: event_percent, follow_percent: follow_percent, group_percent: group_percent, user_percent: user_percent, subscriptions_percent: subscriptions_percent, helpers: {
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
							})
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
