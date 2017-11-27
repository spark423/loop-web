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
router.get('/events/calendar', function(req, res) {
  if(req.user) {
    var afterDay = moment(Date.now()).endOf('month').add('days', 6-moment(Date.now()).endOf('month').day()).format().slice(0,-6) + '.000Z';
    var beforeDay = moment(Date.now()).startOf('month').add('days', 0-moment(Date.now()).startOf('month').day()).format().slice(0,-6) + '.000Z';
    Event.find({$and: [{date: {$lte: afterDay}}, {date: {$gte: beforeDay}}]}, function(err, events) {
      if(err) throw err;
      let sortedEvents = quickSort(events, 0, events.length-1);
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      res.render('events-calendar-view', {events: sortedEvents, month: months[moment().month()], year: moment().local().year(), thisMonth: moment().local().daysInMonth(), lastMonth: moment().local().add('month', -1).daysInMonth(), lastMonthStart: moment().local().startOf('month').add('days', 0-moment().startOf('month').day()).date()});
    })
  } else {
    res.redirect('/');
  }
})

router.post('/events/change', function(req, res) {
  var endofMonth = moment({year: req.body.currentYear, month: req.body.currentMonth}).endOf('month');
  var startofMonth = moment({year: req.body.currentYear, month: req.body.currentMonth});
  var afterDay = endofMonth.add('days', 6-endofMonth.day()).format().slice(0,-6) + '.000Z';
  var beforeDay = startofMonth.add('days', 0-startofMonth.day()).format().slice(0,-6) + '.000Z';
  Event.find({$and: [{date: {$lte: afterDay}}, {date: {$gte: beforeDay}}]}, function(err, events) {
    if(err) throw err;
    let sortedEvents = quickSort(events, 0, events.length-1);
    console.log(sortedEvents);
    startofMonth = moment({year: req.body.currentYear, month: req.body.currentMonth});
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var info = {events: sortedEvents, month: months[req.body.currentMonth], year: req.body.currentYear, thisMonth: moment({year: req.body.currentYear, month: req.body.currentMonth}).daysInMonth(), lastMonth: moment({year: req.body.currentYear, month: req.body.currentMonth}).add('month', -1).daysInMonth(), lastMonthStart: startofMonth.add('days', 0-startofMonth.day()).date()};
    res.send(info);
  })
})

router.get('/boardinfo', function(req, res) {
  if(req.user) {
    Board.find({}, function(err, boards) {
      if(err) throw err;
      var info = [];
      for(var i=0; i<boards.length; i++) {
        if(boards[i].archive==false) {
          info.push({"name": boards[i].name, "_id": boards[i]._id, "unsubscribable": boards[i].unsubscribable, "active": boards[i].active});
        }
      }
      res.send({"info": info, "subscribedBoards": req.user.subscribedBoards});
    });
  } else {
    res.redirect('/');
  }
});

router.get('/events/past', function(req, res) {
  if(req.user) {
    Event.find({$and: [{date: {$lte: moment(Date.now()).local().startOf('day').format().slice(0,-6) + '.000Z'}, archive: false}]}).populate('board').exec(function(err, events) {
      let sortedEvents = quickSort(events, 0, events.length-1).reverse();
      let eventObjects = sortedEvents.filter(function(event) {
        if(event.endTime) {
          var endTime = moment(event.endTime, "HH:mm").local().format('h:mm a');
        } else {
          var endTime = "";
        }
        if(moment(Date.now()).local().format('MMMM D, YYYY')==moment(event.date).utc().format('MMMM D, YYYY') && (endTime > moment(Date.now()).local().format('h:mm a') || startTime > moment(Date.now()).local().format('h:mm a'))) {
          return false;
        }
        return true;
      }).map(async function(event) {
        var user = await User.findOne({username: event.contact});
        if(event.endTime) {
          var endTime = moment(event.endTime, "HH:mm").local().format('h:mm a');
        } else {
          var endTime = "";
        }
        if(user) {
            let eventObject= {
                "id": event._id,
                "createdAt": moment(event.createdAt).local().format('MMMM D, YYYY, h:mm a'),
                "title": event.title,
                "postedBy": {
                  "id": user._id,
                  "firstName": user.firstName,
                  "lastName": user.lastName,
                  "isLoopUser": true
                },
                "board": {
                  "id": event.board._id,
                  "name": event.board.name
                },
                "archive": event.archive,
                "description": event.description,
                "date": moment(event.date).utc().format('MMMM D, YYYY'),
                "startTime": moment(event.startTime, "HH:mm").local().format('h:mm a'),
                "endTime": endTime,
                "location": event.location,
                "currentDate": moment(Date.now()).local().format('MMMM D, YYYY'),
                "currentTime": moment(Date.now()).local().format('h:mm a')
              }
              return Promise.resolve(eventObject);
        } else {
          let eventObject= {
            "id": event._id,
            "createdAt": moment(event.createdAt).local().format('MMMM D, YYYY, h:mm a'),
            "title": event.title,
            "postedBy": {
              "id": "",
              "firstName": "",
              "lastName": "",
              "username": event.contact,
              "isLoopUser": false
            },
            "board": {
              "id": event.board._id,
              "name": event.board.name
            },
            "archive": event.archive,
            "description": event.description,
            "date": moment(event.date).utc().format('MMMM D, YYYY'),
            "startTime": moment(event.startTime, "HH:mm").local().format('h:mm a'),
            "endTime": endTime,
            "location": event.location,
            "currentDate": moment(Date.now()).local().format('MMMM D, YYYY'),
            "currentTime": moment(Date.now()).local().format('h:mm a')
          }
          return Promise.resolve(eventObject);
        }
      })
      Promise.all(eventObjects).then(function(events) {
        res.render("past-events", {events: events, helpers: {
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
  } else {
    res.redirect('/');
  }
})
//Render event creation page
router.get('/events/create', function(req, res) {
  if(req.user) {
    Board.find({}, function(err, boards) {
      if(err) throw err;
      var info = [];
      for(var i=0; i<boards.length; i++) {
        if(boards[i].archive==false) {
          info.push({"name": boards[i].name, "_id": boards[i]._id, "active": boards[i].active});
        }
      }
      res.render("create-a-new-event", {boards: info});
    })
  } else {
    res.redirect('/');
  }
});

router.post('/event-invite', function(req, res) {
  var title = encodeURIComponent(req.body.title);
  var description = encodeURIComponent(req.body.description);
  var board = encodeURIComponent(req.body.board);
  var startTime = encodeURIComponent(req.body.startTime);
  var endTime = encodeURIComponent(req.body.endTime);
  var location = encodeURIComponent(req.body.location);
  var date = encodeURIComponent(req.body.date);
  var contact = encodeURIComponent(req.user.username);
  res.redirect('/create-a-new-event-invite/?title=' + title + '&description=' + description + '&board=' + board + '&startTime=' + startTime + '&endTime=' + endTime + '&location=' + location + '&date=' + date + '&contact=' + contact);
})

router.get('/create-a-new-event-invite', function(req, res) {
  if(req.user) {
    User.find({}, function(err, users) {
      if(err) throw err;
      var user_info = [];
      for(var i=0; i<users.length; i++) {
        if(req.user.username!=users[i].username) {
          user_info.push({"firstName": users[i].firstName, "lastName": users[i].lastName, "username": users[i].username, "major": users[i].major, "classYear": users[i].classYear});
        }
      }
      res.render('create-a-new-event-invite', {title: req.query.title, description: req.query.description, board: req.query.board, date: req.query.date, startTime: req.query.startTime, endTime: req.query.endTime, location: req.query.location, contact: req.query.contact, users: user_info});
    })
  } else {
    res.redirect('/');
  }
})
//Create a new event
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
  var addMembers = req.body.addMembers.split(',');
  var removeMembers = req.body.removeMembers.split(',');
  for(var i=0; i<removeMembers.length; i++) {
    for(var j=0; j<addMembers.length; j++) {
      if(removeMembers[i]==addMembers[j]) {
        addMembers.splice(j, 1);
      }
    }
  }
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
            User.find({'username': addMembers}, function(err, members) {
              if(err) throw err;
              var newNotification = new Notification({
                type: 'Invited to Event',
                message: "You have been invited to a new Event, " + newEvent.title + ".",
                routeID: {
                  kind: 'Event',
                  item: newEvent._id
                }
              });
              newNotification.save(function(err, notification) {
                if(err) throw err;
                for(var i=0; i<members.length; i++) {
                  members[i].notifications.push(notification._id);
                  members[i].save(function(err, completeUser) {
                    if(err) throw err;
                  })
                }
                res.redirect('/boards/' + updatedBoard._id);
              });
            })
					})
				})
      })
    })
  })
});

//Render Event page
router.get('/event/:id', function(req, res) {
  if(req.user) {
    Event.findById(req.params.id).populate([{path: 'comments', populate: [{path: 'postedBy'}]}]).exec(function(err, event) {
      if(err) throw err;
      Board.findById(event.board, function(err, board) {
        if(err) throw err;
        User.find({"_id": event.attendees}, function(err, attendees) {
          if(err) throw err;
          if(event.attendees.indexOf(req.user._id)!=-1) {
            var attending = true;
          }
          else {
            var attending = false;
          }
          let comments = event.comments.map(function(comment) {
            return {"id": comment._id, "createdAt": moment(comment.createdAt).local().format('MMMM D, YYYY, h:mm a'), "postedBy": {"id": comment.postedBy._id, "firstName": comment.postedBy.firstName, "lastName": comment.postedBy.lastName}, "text": comment.text}
          })
          if(event.endTime) {
            var endTime = moment(event.endTime, "HH:mm").local().format('h:mm a');
          } else {
            var endTime = "";
          }
          User.findOne({"username": event.contact}, function(err, user) {
            if(err) throw err;
            if(user) {
              var eventObject = {
                "id": event._id,
                "createdAt": moment(event.createdAt).local().format('MMMM D, YYYY, h:mm a'),
                "postedBy": {
                  "id": user._id,
                  "firstName": user.firstName,
                  "lastName": user.lastName,
                  "isLoopUser": true
                },
                "title": event.title,
                "board": event.board,
                "archive": event.archive,
                "date": moment(event.date).utc().format('MMMM D, YYYY'),
                "startTime": moment(event.startTime, "HH:mm").local().format('h:mm a'),
                "endTime": endTime,
                "location": event.location,
                "description": event.description,
                "comments": comments,
                "attendees": attendees,
                "attending": attending
              }
            } else {
              var eventObject = {
                "id": event._id,
                "createdAt": moment(event.createdAt).local().format('MMMM D, YYYY, h:mm a'),
                "postedBy": {
                  "username": event.contact,
                  "isLoopUser": false
                },
                "title": event.title,
                "board": event.board,
                "archive": event.archive,
                "date": moment(event.date).utc().format('MMMM D, YYYY'),
                "startTime": moment(event.startTime, "HH:mm").local().format('h:mm a'),
                "endTime": endTime,
                "location": event.location,
                "description": event.description,
                "comments": comments,
                "attendees": attendees,
                "attending": attending
              }
            }
            res.render('event-detail', {"event": eventObject, "board": board.name, helpers: {
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
  } else {
    res.redirect('/');
  }
})

//Render all events
router.get('/events', function(req, res) {
	if(req.user) {
    Event.find({$and: [{date: {$gte: moment(Date.now()).local().startOf('day').format().slice(0,-6) + '.000Z'}, archive: false}]}).populate('board').exec(function(err, events) {
      if(err) throw err;
  			let sortedEvents = quickSort(events, 0, events.length-1);
  			let eventObjects = sortedEvents.map(async function(event) {
          var user = await User.findOne({username: event.contact});
          if(event.endTime) {
            var endTime = moment(event.endTime, "HH:mm").local().format('h:mm a');
          } else {
            var endTime = "";
          }
          if(user) {
              let eventObject= {
                  "id": event._id,
                  "createdAt": moment(event.createdAt).local().format('MMMM D, YYYY, h:mm a'),
                  "title": event.title,
                  "postedBy": {
                    "id": user._id,
                    "firstName": user.firstName,
                    "lastName": user.lastName,
                    "isLoopUser": true
                  },
                  "board": {
                    "id": event.board._id,
                    "name": event.board.name
                  },
                  "archive": event.archive,
                  "description": event.description,
                  "date": moment(event.date).utc().format('MMMM D, YYYY'),
                  "startTime": moment(event.startTime, "HH:mm").local().format('h:mm a'),
                  "endTime": endTime,
                  "location": event.location,
                  "currentDate": moment(Date.now()).local().format('MMMM D, YYYY'),
                  "currentTime": moment(Date.now()).local().format('h:mm a')
                }
                return Promise.resolve(eventObject);
          } else {
            let eventObject= {
              "id": event._id,
              "createdAt": moment(event.createdAt).local().format('MMMM D, YYYY, h:mm a'),
              "title": event.title,
              "postedBy": {
                "id": "",
                "firstName": "",
                "lastName": "",
                "username": event.contact,
                "isLoopUser": false
              },
              "board": {
                "id": event.board._id,
                "name": event.board.name
              },
              "archive": event.archive,
              "description": event.description,
              "date": moment(event.date).utc().format('MMMM D, YYYY'),
              "startTime": moment(event.startTime, "HH:mm").local().format('h:mm a'),
              "endTime": endTime,
              "location": event.location,
              "currentDate": moment(Date.now()).local().format('MMMM D, YYYY'),
              "currentTime": moment(Date.now()).local().format('h:mm a')
            }
            return Promise.resolve(eventObject);
          }
        })
        Promise.all(eventObjects).then(function(events) {
            Board.find({}, function(err, boards) {
              if(err) throw err;
              var info = [];
              for(var i=0; i<boards.length; i++) {
                if(boards[i].archive==false) {
                  info.push({"name": boards[i].name, "_id": boards[i]._id, "active": boards[i].active});
                }
              }
              res.render('events-list-view', {events: events, boards: info, helpers: {
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

//Render edit event page
router.get('/event/:id/edit', function(req, res) {
  if(req.user) {
    Event.findById(req.params.id, function(err, event) {
      if(err) throw err;
      var date = moment(event.date).utc().format("YYYY-MM-DD");
      res.render('edit-event', {event: event, date: date});
    })
  } else {
    res.redirect('/');
  }
})

//Edit an event
router.post('/event/:id/edit', function(req, res) {
  Event.findById(req.params.id, function(err, event) {
    if(err) throw err;
    event.title = req.body.title;
    event.description = req.body.description;
    event.date = req.body.date;
    event.startTime = req.body.startTime;
    event.endTime = req.body.endTime;
    event.location= req.body.location;
    event.save(function(err, updatedEvent) {
      if(err) throw err;
      res.redirect('/event/' + updatedEvent._id)
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

//Deleting event from board
router.post('/events/:id', function(req, res) {
	Event.findById(req.params.id, function(err, event) {
		if (err)  {
			throw err;
		} else {
      event.archive = true;
      event.save(function(err, unpdatedEvent) {
        Board.findOneAndUpdate({_id: event.board}, {$pull: {contents: {item: req.params.id}}}, function(err) {
          if (err) {
            throw err;
          } else {
            res.redirect('/boards/' + event.board);
          }
        })
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
					if (err) throw err;
          User.findOne({username: post.contact}, function(err, eventPoster) {
            if(err) throw err;
            if(eventPoster) {
              if(req.user._id.toString()==eventPoster._id.toString()) {
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
                        if(comment.postedBy.toString()==followerID.toString()) {
                          resolve();
                        } else {
                          User.findOneAndUpdate({_id: followerID}, {$push: {notifications: notificationToFollowers._id}}, function(err) {
                            if (err) {
                              throw reject(err);
                            } else {
                              resolve();
                            }
                          })
                        }
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
    							User.findOneAndUpdate({username: post.contact}, {$push: {notifications: notificationToPoster._id}}, function(err) {
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
                              if(comment.postedBy.toString() == followerID.toString() || eventPoster._id.toString() == followerID.toString()) {
                                resolve();
                              } else {
                                User.findOneAndUpdate({_id: followerID}, {$push: {notifications: notificationToFollowers._id}}, function(err) {
      														if (err) {
      															throw reject(err);
      														} else {
      															resolve();
      														}
      													})
                              }
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
                      if(comment.postedBy.toString()==followerID.toString()) {
                        resolve();
                      } else {
                        User.findOneAndUpdate({_id: followerID}, {$push: {notifications: notificationToFollowers._id}}, function(err) {
                          if (err) {
                            throw reject(err);
                          } else {
                            resolve();
                          }
                        })
                      }
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
					res.status(200);
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
					res.status(200);
				})
			})
		})
	})
})

module.exports = router;
