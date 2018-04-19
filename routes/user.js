var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Office = require('../models/office');
var moment = require('moment-timezone');

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

//Get user info for sidenav
router.get('/userinfo', function(req, res) {
	var info = [];
	info.push({"firstName": req.user.firstName, "lastName": req.user.lastName, "_id": req.user._id});
	res.send(info);
})

router.get('/blocked', function(req, res) {
	if(req.user) {
		res.send(req.user.blocked);
	}
})
//View someone else's page
router.get('/users/:id', function(req, res) {
  if(req.user && !req.user.verified) {
    res.redirect('/not-verified');
  }
  else if(req.user) {
		User.findById(req.params.id).populate([{path: 'posts', populate: [{path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]}, {path: 'tags'}, {path: 'adminGroups'}, {path: 'joinedGroups'}, {path: 'subscribedBoards'}]).exec(function(err, user) {
			if (err) throw err;
			Event.find({contact: user.username}).populate([{path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]).populate('tags').exec(function(err, events) {
				if(err) throw err;
				let contents = [];
				contents = contents.concat(events);
				contents = contents.concat(user.posts);
				let sortedContents = quickSort(contents, 0, contents.length-1);
				sortedContents.reverse();
				pages = [];
				numPages = 0;
				currentPage = 0;
				let feed = sortedContents.map(async function(item) {
					let comments = [];
						for (let j=0; j<item.comments.length; j++) {
							let comment = item.comments[j];
									commentOfComments = comment.comments.map(function(commentOfComment) {
										return {"own": req.user._id.toString() === commentOfComment.postedBy._id.toString(), "id": commentOfComment._id, "createdAt": commentOfComment.createdAt, "postedBy": {"id": commentOfComment.postedBy._id, "firstName": commentOfComment.postedBy.firstName, "lastName": commentOfComment.postedBy.lastName}, "flagged": commentOfComment.flagged}
									})
							comments.push({
								"own": req.user._id.toString() === comment.postedBy._id.toString(),
								"id": comment._id,
								"createdAt": moment(comment.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
								"postedBy": {
									"id": comment.postedBy._id,
									"firstName": comment.postedBy.firstName,
									"lastName": comment.postedBy.lastName
								},
								"text": comment.text,
								"flagged": comment.flagged,
								"comments": commentOfComments
							});
						}
					if (!item.date) {
						if(item.postingGroup) {
							let postCreator = await Group.findById(item.postingGroup);
							let boardName = await Board.findById(item.board);
							let postObject = {
								"own": req.user._id.toString() === item.postedBy.toString(),
								"following": req.user.followingPosts.indexOf(item._id) > -1,
								"id": item._id,
								"board": item.board,
								"boardName": boardName.name,
								"createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
								"postingGroup": {
									"id": postCreator._id,
									"name": postCreator.name
								},
								"title": item.title,
								"text": item.text,
								"flagged": item.flagged,
								"comments": comments,
								"tags": item.tags
							}
							return Promise.resolve(postObject)
						} else if(item.postingOffice) {
							let postCreator = await Office.findById(item.postingOffice);
							let boardName = await Board.findById(item.board);
							let postObject = {
								"own": req.user._id.toString() === item.postedBy.toString(),
								"following": req.user.followingPosts.indexOf(item._id) > -1,
								"id": item._id,
								"board": item.board,
								"boardName": boardName.name,
								"createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
								"postingOffice": {
									"id": postCreator._id,
									"name": postCreator.name
								},
								"title": item.title,
								"text": item.text,
								"flagged": item.flagged,
								"comments": comments,
								"tags": item.tags
							}
							return Promise.resolve(postObject)
						} else {
							let postCreator = await User.findById(item.postedBy);
							let boardName = await Board.findById(item.board);
							let postObject = {
								"own": req.user._id.toString() === postCreator._id.toString(),
								"following": req.user.followingPosts.indexOf(item._id) > -1,
								"id": item._id,
								"board": item.board,
								"boardName": boardName.name,
								"createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
								"postedBy": {
									"id": postCreator._id,
									"firstName": postCreator.firstName,
									"lastName": postCreator.lastName
								},
								"title": item.title,
								"text": item.text,
								"flagged": item.flagged,
								"comments": comments,
								"tags": item.tags
							}
							return Promise.resolve(postObject)
						}
					} else {
						let attendees = item.attendees.map(function(attendee) {
							return {"id": attendee._id, "firstName": attendee.firstName, "lastName": attendee.lastName}
						})
						if(item.endTime) {
							var endTime = moment(item.endTime, "HH:mm").utc().format('h:mm a');
						} else {
							var endTime = "";
						}
						if(item.postingGroup) {
							let eventCreator = await Group.findById(item.postingGroup);
							let eventObject = {
								"own": req.user.username === item.postedBy,
								"attending": req.user.attendedEvents.indexOf(item._id) > -1,
								"id": item._id,
								"createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
								"postingGroup": {
									"id": eventCreator._id,
									"name": eventCreator.name,
									"isLoopUser": true
								},
								"title": item.title,
								"date": moment(item.date).utc().format('MMMM D, YYYY'),
								"startTime": moment(item.startTime, "HH:mm").utc().format('h:mm a'),
								"endTime": endTime,
								"location": item.location,
								"description": item.description,
								"flagged": item.flagged,
								"comments": comments,
								"attendees": attendees,
								"tags": item.tags
							}
							return Promise.resolve(eventObject);
						} else if(item.postingOffice) {
							let eventCreator = await Office.findById(item.postingOffice);
							let eventObject = {
								"own": req.user.username === item.postedBy,
								"attending": req.user.attendedEvents.indexOf(item._id) > -1,
								"id": item._id,
								"createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
								"postingOffice": {
									"id": eventCreator._id,
									"name": eventCreator.name,
									"isLoopUser": true
								},
								"title": item.title,
								"date": moment(item.date).utc().format('MMMM D, YYYY'),
								"startTime": moment(item.startTime, "HH:mm").utc().format('h:mm a'),
								"endTime": endTime,
								"location": item.location,
								"description": item.description,
								"flagged": item.flagged,
								"comments": comments,
								"attendees": attendees,
								"tags": item.tags
							}
							return Promise.resolve(eventObject);
						} else {
							let eventCreator = await User.findOne({username: item.contact});
							if (eventCreator) {
								let eventObject = {
									"own": req.user.username === item.postedBy,
									"attending": req.user.attendedEvents.indexOf(item._id) > -1,
									"id": item._id,
									"createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
									"postedBy": {
										"id": eventCreator._id,
										"firstName": eventCreator.firstName,
										"lastName": eventCreator.lastName,
										"isLoopUser": true
									},
									"title": item.title,
									"date": moment(item.date).utc().format('MMMM D, YYYY'),
									"startTime": moment(item.startTime, "HH:mm").utc().format('h:mm a'),
									"endTime": endTime,
									"location": item.location,
									"description": item.description,
									"flagged": item.flagged,
									"comments": comments,
									"attendees": attendees,
									"tags": item.tags
								}
								return Promise.resolve(eventObject);
							} else {
								let eventObject = {
									"own": req.user.username === item.postedBy,
									"attending": req.user.attendedEvents.indexOf(item._id) > -1,
									"id": item._id,
									"createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
									"postedBy": {
										"username": item.contact,
										"isLoopUser": false
									},
									"title": item.title,
									"date": moment(item.date).utc().format('MMMM D, YYYY'),
									"startTime": moment(item.startTime, "HH:mm").utc().format('h:mm a'),
									"endTime": endTime,
									"location": item.location,
									"description": item.description,
									"flagged": item.flagged,
									"comments": comments,
									"attendees": attendees,
									"tags": item.tags
								};
								return Promise.resolve(eventObject);
							}
						}
					}
				})
				Promise.all(feed).then(function(feed) {
					res.render('profile-user',{
						"user": {
							id: user._id,
							blocked: user.blocked,
							username: user.username,
							firstName: user.firstName,
							lastName: user.lastName,
							major: user.major,
							classYear: user.classYear,
							description: user.description,
							adminGroups: user.adminGroups,
							joinedGroups: user.joinedGroups,
							subscribedBoards: user.subscribedBoards,
							title: user.title,
							division: user.division,
							tags: user.tags
						}, contents: feed, self: req.user._id==user.id, admin: req.user.admin, helpers: {
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
							}
					})
				})
			})
		})
	} else {
		res.redirect('/');
	}
});

//update user page
router.post('/users/:id/edit', function(req, res) {
	User.findById(req.user._id, function(error, user) {
		if (error)
			throw error;
		if (req.body.major) {
		   user.major = req.body.major;
		}
		if (req.body.classYear) {
		   user.classYear = req.body.classYear;
		}
		if (req.body.description) {
		   user.description = req.body.description;
		}
		user.validateSync();
		user.save(function(error, updatedUser) {
			if (error)
				throw error;
			res.redirect('/users/' + updatedUser._id)
		})
	})
})

router.post('/user/:id/block', function(req, res) {
	User.findById(req.params.id, function(err, user) {
		if(err) throw err;
		user.blocked = true;
		user.save(function(err, updatedUser) {
			if(err) throw err;
			res.status(200);
		})
	})
})

router.post('/user/:id/unblock', function(req, res) {
	User.findById(req.params.id, function(err, user) {
		if(err) throw err;
		user.blocked = false;
		user.save(function(err, updatedUser) {
			if(err) throw err;
			res.status(200);
		})
	})
})

module.exports = router;
