var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Event = require('../models/event');
var Comment = require('../models/comment');
var Notification = require('../models/notification')
var moment = require('moment');

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
        while ((moment(items[i].date).utc() + moment(items[i].startTime, "HH:mm")) < (moment(pivot.date).utc() + moment(pivot.startTime, "HH:mm"))) {
            i++;
        }

        console.log('item', (moment(items[j].date).utc() + moment(items[j].startTime, "HH:mm")))
        console.log('pivot', (moment(pivot.date).utc() + moment(pivot.startTime, "HH:mm")))
        while ((moment(items[j].date).utc() + moment(items[j].startTime, "HH:mm")) > (moment(pivot.date).utc() + moment(pivot.startTime, "HH:mm"))) {
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

router.get('/events/create', function(req, res) {
	Board.find({}, function(err, boards) {
		if(err) throw err;
		var info = [];
		for(var i=0; i<boards.length; i++) {
			info.push({"name": boards[i].name, "_id": boards[i]._id});
		}
		res.render("create-a-new-event", {boards: info});
	})
})

router.get('/events-invite', function(req, res) {
	res.render("create-a-new-event-invite");
})

router.post('/events/create', function(req, res) {
  var newEvent = new Event({
    title: req.body.title,
		description: req.body.description,
    board: req.body.board,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    location: req.body.location,
    date: req.body.date,
		contact: req.user.username
  });
	newEvent.attendees.push(req.user._id);
  newEvent.save(function(error, newEvent) {
    if (error) throw error;
    User.findById(req.user._id, function(error, user) {
      if (error) throw error;
			user.attendedEvents.push(newEvent._id);
      user.save(function(error, updatedUser) {
        if (error) throw error;
				Board.findById(newEvent.board, function(err, board) {
					if (err) throw err;
					board.contents.push({"kind": "Event", "item": newEvent._id});
					board.save(function(err, updatedBoard) {
						if(err) throw err;
						res.redirect('/boards/' + updatedBoard._id);
					})
				})
      })
    })
  })
});

router.get('/event/:id', function(req, res) {
	Event.findById(req.params.id, function(err, event) {
		if(err) throw err;
		Board.findById(event.board, function(err, board) {
			if(err) throw err;
			User.find({"_id": event.attendees}, function(err, attendees) {
				if(err) throw err;
				User.findOne({"username": event.contact}, function(err, user) {
					if(err) throw err;
					console.log(attendees);
				  var eventObject = {
						"id": event._id,
						"createdAt": moment(event.createdAt).format('MMMM D, YYYY, h:mm a'),
						"postedBy": {
							"id": user._id,
							"firstName": user.firstName,
							"lastName": user.lastName
						},
						"title": event.title,
						"board": event.board,
						"date": moment(event.date).utc().format('MMMM D, YYYY'),
						"startTime": moment(event.startTime, "HH:mm").format('h:mm a'),
						"endTime": moment(event.endTime, "HH:mm").format('h:mm a'),
						"location": event.location,
						"description": event.description,
						"comments": event.comments,
						"attendees": attendees
					}
					res.render('event-detail', {"event": eventObject, "board": board.name});
				})
			})
		})
	})
})

router.get('/event-attendees', function(req, res) {
	res.render('event-attendees-list')
})
router.get('/events', function(req, res) {
	if(req.user) {
		Event.find({}, function(err, events) {
			if(err) throw err;
			console.log(events[0].board);
			let sortedEvents = quickSort(events, 0, events.length-1);
			let eventObjects = sortedEvents.map(async function(event) {
				let board = await Board.findById(event.board);
				if(board) {
					let user = await User.findOne({username: event.contact});
					if(user) {
						let eventObject = {
							"id": event._id,
							"createdAt": moment(event.createdAt).format('MMMM D, YYYY, h:mm a'),
							"title": event.title,
							"postedBy": {
								"id": user._id,
								"firstName": user.firstName,
								"lastName": user.lastName
							},
							"board": {
								"id": board._id,
								"name": board.name
							},
							"description": event.description,
							"date": moment(event.date).utc().format('MMMM D, YYYY'),
							"startTime": moment(event.startTime, "HH:mm").format('h:mm a'),
							"endTime": moment(event.endTime, "HH:mm").format('h:mm a'),
							"location": event.location,
							"currentDate": moment(Date.now()).format('MMMM D, YYYY'),
							"currentTime": moment(Date.now()).format('h:mm a')
						}
						return Promise.resolve(eventObject);
					}
				}
			});
			Promise.all(eventObjects).then(function(events) {
				console.log(events);
				Board.find({}, function(err, boards) {
					if(err) throw err;
					var info = [];
					for(var i=0; i<boards.length; i++) {
						info.push({"name": boards[i].name, "_id": boards[i]._id});
					}
          var now = false;
          var upcoming = false;
          var past = false;
          for(var i=0; i<events.length; i++) {
            if(events[i].date==events[i].currentDate && events[i].currentTime >= events[i].startTime && events[i].currentTime < events[i].endTime) {
              var now = true;
              break;
            }
          }
          for(var i=0; i<events.length; i++) {
            if((events[i].date==events[i].currentDate && events[i].currentTime > events[i].startTime) || events[i].currentDate > events[i].date) {
              var upcoming = true;
              break;
            }
          }
          for(var i=0; i<events.length; i++) {
            if((events[i].date==events[i].currentDate && events[i].currentTime > events[i].endTime) || events[i].currentDate > events[i].date) {
              var past = true;
              break;
            }
          }
					res.render('events-list-view', {events: events, boards: info, now: now, upcoming: upcoming, past: past, helpers: {
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
	} else {
		res.redirect('/');
	}
});
router.get('/event-calendar', function(req, res) {
	res.render('events-calendar-view')
})
router.get('/edit-event', function(req, res) {
	res.render('edit-event');
})
//Editing event
router.post('/events/:id/edit', function(req, res) {
	Event.findById(req.params.id, function(error, event) {
		if (error)
			throw error;
		if (req.body.name) {
			event.name = req.body.name
		}
		if (req.body.startTime) {
		  event.startTime = req.body.startTime
		}
		if (req.body.endTime) {
		  event.endTime = req.body.endTime
		}
		if (req.body.location) {
		  event.location = req.body.location
		}
		if (req.body.text) {
		  event.text = req.body.text
		}
		event.save(function(error, updatedEvent) {
			if (error)
				throw error;
			res.redirect('back')
		})
	})
})

//New attendee
router.put('/events/:id', function(req, res) {
	Event.findOneAndUpdate({_id: req.params.id}, {$push: {attendees: req.user._id}}, function(err, event) {
		if (err) {
			throw err;
		} else {
			User.findOneAndUpdate({_id: req.user._id}, {$push: {attendedEvents: req.params.id}}, function(err, currentUser) {
				if (err) {
					throw err;
				} else {
					User.findOne({username: event.postedBy}, function(err, eventCreator) {
						if (err) {
							throw err;
						} else if (eventCreator) {
							let notificationToCreator = new Notification({
								type: 'Attend Event',
								message: currentUser.firstName + " " + currentUser.lastName + " is attending your event: " + event.title,
								routeID: {
									kind: 'Event',
									item: event._id
								}
							})
							notificationToCreator.save(function(err, notificationToCreator){
								if (err) {
									throw err;
								} else {
									User.findOneAndUpdate({_id: eventCreator._id}, {$push: {notifications: notificationToCreator._id}}, function(err) {
										if (err) {
											throw err;
										} else {
											res.json({success: true});
										}
									})
								}
							})
						} else {
							res.json({success: true});
						}
					})
				}
			})
		}
	})
})

//Deleting event from event board
router.post('/events/:id', function(req, res) {
	Event.findById(req.params.id, function(err, event) {
		if (err)  {
			throw err;
		} else {
			Board.findOneAndUpdate({_id: event.board}, {$pull: {contents: {item: req.params.id}}}, function(err) {
				if (err) {
					throw err;
				} else {
					res.redirect('/boards/' + event.board);
				}
			})
		}
	})
})

//Commenting on event
router.post('/events/:id/comment', function(req, res) {
	let newComment = new Comment({
		postedBy: req.user._id,
		source: {"kind": 'Event', "item": req.params.id},
		text: req.body.text
	})
	newComment.save(function(err, comment) {
		Event.findOneAndUpdate({_id: req.params.id}, {$push: {comments: comment._id}}, function(err, post) {
			if (err) {
				throw err;
			} else {
				User.findOneAndUpdate({_id: req.user._id}, {$push: {comments: comment._id}}, function(err, currentUser) {
					if (err) {
						throw err;
					} else if(req.user._id==post.postedBy) {
						let notificationToFollowers = new Notification({
							type: 'Comment on Attending Event',
							message: currentUser.firstName + " " + currentUser.lastName + " " + "commented on the event \"" + post.title + "\" that you are attending.",
							routeID: {
								kind: 'Event',
								item: post._id
							}
						})
						notificationToFollowers.save(function(err, notificationToFollowers) {
							if (err) {
								throw err;
							} else {
								let promises = post.attendees.map(function(followerID) {
									return new Promise(function(resolve, reject) {
										User.findOneAndUpdate({_id: followerID}, {$push: {notifications: notificationToFollowers._id}}, function(err) {
											if (err) {
												throw reject(err);
											} else {
												resolve();
											}
										})
									});
								});
								Promise.all(promises).then(function() {
									res.redirect('/boards/' + post.board);
								}).catch(console.error);
							}
						})
					}
					else {
						let notificationToPoster = new Notification({
							type: 'Comment on Created Event',
							message: currentUser.firstName + " " + currentUser.lastName + " " + "commented on your event titled \"" + post.title + "\".",
							routeID: {
								kind: 'Event',
								item: post._id
							}
						})
						notificationToPoster.save(function(err, notificationToPoster) {
							User.findOneAndUpdate({_id: post.postedBy}, {$push: {notifications: notificationToPoster._id}}, function(err) {
								if (err) {
									throw err;
								} else {
									let notificationToFollowers = new Notification({
										type: 'Comment on Attending Event',
										message: currentUser.firstName + " " + currentUser.lastName + " " + "commented on the event \"" + post.title + "\" that you are attending.",
										routeID: {
											kind: 'Event',
											item: post._id
										}
									})
									notificationToFollowers.save(function(err, notificationToFollowers) {
										if (err) {
											throw err;
										} else {
											let promises = post.attendees.map(function(followerID) {
												return new Promise(function(resolve, reject) {
													User.findOneAndUpdate({_id: followerID}, {$push: {notifications: notificationToFollowers._id}}, function(err) {
														if (err) {
															throw reject(err);
														} else {
															resolve();
														}
													})
												});
											});
											Promise.all(promises).then(function() {
												res.redirect('/boards/' + post.board);
											}).catch(console.error);
										}
									})
								}
							})
						})
					}
				})
			}
		})
	})
})

//Attend event
router.post('/events/:id/attend', function(req, res) {
	User.findById(req.user._id, function(error, user) {
		if (error)
			throw error;
		user.attendedEvents.push(req.params.id)
		user.save(function(error, updatedUser) {
			if (error)
				throw error;
			Event.findById(req.params.id, function(error, event) {
				if (error)
					throw error;
				event.attendees.push(user._id)
				event.save(function(error, updatedEvent) {
					if (error)
						throw error;
					res.redirect('back')
				})
			})
		})
	})
})

//Unattend event
router.post('/events/:id/unattend', function(req, res) {
	User.findById(req.user._id, function(error, user) {
		if (error)
			throw error;
		var attendedEvents = user.attendedEvents
		var index1 = attendedEvents.indexOf(req.params.id)
		user.attendedEvents = attendedEvents.slice(0, index1).concat(attendedEvents.slice(index1+1, attendedEvents.length))
		user.save(function(error, updatedUser) {
			if (error)
				throw error;
			Event.findById(req.params.id, function(error, event) {
				if (error)
					throw error;
				var attendees = event.attendees
				var index2 = attendees.indexOf(req.user._id)
				event.attendees = attendees.slice(0, index2).concat(attendees.slice(index2+1, attendees.length))
				event.save(function(error, updatedEvent) {
					if (error)
						throw error;
					res.redirect('back')
				})
			})
		})
	})
})

module.exports = router;
