var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Event = require('../models/event');
var Comment = require('../models/comment');
var Notification = require('../models/notification')
var Tag = require('../models/tag');
var Office = require('../models/office');
var Group = require('../models/group')
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
        while ((moment(items[i].startTime).utc()) < (moment(pivot.startTime).utc())) {
            i++;
        }
        while ((moment(items[j].startTime).utc()) > (moment(pivot.startTime).utc())) {
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

router.post('/events/:id/flag', function(req, res) {
  	Event.findOneAndUpdate({_id: req.params.id}, {$set: {flagged: true}},function(err,post) {
  		let notificationToPoster = new Notification({
  			type: 'Flagged Event',
  			message: "Your event \"" + post.title + "\" has been flagged. Please wait for the admin's review.",
  			routeID: {
  				kind: 'Event',
  				id: post._id,
          boardId: post.board
  			}
      })
      notificationToPoster.save(function(err, notificationToPoster) {
      	if (err) {
      		throw err;
      	} else {
      		User.findOneAndUpdate({username: post.contact}, {$push: {notifications: notificationToPoster}}, function(err,user) {
      			if (err) {
      				throw err;
      			} else {
      				let notificationToAdmin = new Notification({
      					type: "Flagged Event",
      					message: "The event titled \"" + post.title + "\" has been flagged.",
      					routeID: {
      						kind: 'Event',
      						id: post._id,
                  boardId: post.board
      					}
      				})
      				notificationToAdmin.save(function(err, notificationToAdmin) {
      					if (err) {
      						throw err;
      					} else {
      						User.updateMany({admin: true}, {$push: {notifications: notificationToAdmin}}, function(err, admin) {
      							if (err) {
      								throw err;
      							} else {
                      Board.findOneAndUpdate({_id: post.board}, {$push: {notifications: notificationToAdmin}}, function(err, originBoard) {
                        if (err) {
                          throw err;
                        } else {
                          res.redirect('back');
                        }
                      })
      							}
      						})
      					}
      				})
      			}
      		})
      	}
      })
  	})
  })

router.get('/events/calendar', function(req, res) {
  if(req.user) {
    var afterDay = moment(Date.now()).endOf('month').add(6-moment(Date.now()).endOf('month').day(), 'days').format().slice(0,-6) + '.000Z';
    var beforeDay = moment(Date.now()).startOf('month').add(0-moment(Date.now()).startOf('month').day(),'days').format().slice(0,-6) + '.000Z';
    console.log(afterDay);
    console.log(beforeDay);
    Event.find({$and: [{date: {$lte: afterDay}}, {date: {$gte: beforeDay}}, {"archive": false}]}, function(err, events) {
      if(err) throw err;
      let sortedEvents = quickSort(events, 0, events.length-1);
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      Board.find({}, function(err, boards) {
        if(err) throw err;
        var info = [];
        for(var i=0; i<boards.length; i++) {
    			if(boards[i].archive==false && req.user.viewBlockedBoards.indexOf(boards[i]._id)==-1 && req.user.postBlockedBoards.indexOf(boards[i]._id)==-1) {
            if(req.user.admin) {
              info.push({"name": boards[i].name, "_id": boards[i]._id, "active": boards[i].active});
            } else {
              if(boards[i].private==false && boards[i].create==true)
              info.push({"name": boards[i].name, "_id": boards[i]._id, "active": boards[i].active});
            }
    			}
    		}
        User.findById(req.user._id).populate('adminGroups').populate('office').exec(function(err, user) {
          if(err) throw err;
          var adminGroups = []
          for(var i=0; i<user.adminGroups.length; i++) {
            if(user.adminGroups[i].archive==false && user.adminGroups[i].active==true) {
              adminGroups.push(user.adminGroups[i]);
            }
      		}
          Tag.find({}, function(err, tags) {
            if(err) throw err;
            res.render('events-calendar-view', {blocked: req.user.blocked, tags: tags, boards: info, groups: adminGroups, office: user.office, admin: req.user.admin, events: sortedEvents, month: months[moment().month()], year: moment().tz("America/New_York").year(), thisMonth: moment().tz("America/New_York").daysInMonth(), lastMonth: moment().tz("America/New_York").add(-1, 'month').daysInMonth(), lastMonthStart: moment().tz("America/New_York").startOf('month').add(0-moment().startOf('month').day(), 'days').date()});
          })
        })
      })
    })
  } else {
    res.redirect('/');
  }
})

router.post('/events/change', function(req, res) {
  var endofMonth = moment({year: req.body.currentYear, month: req.body.currentMonth}).endOf('month');
  var startofMonth = moment({year: req.body.currentYear, month: req.body.currentMonth});
  var afterDay = endofMonth.add(6-endofMonth.day(), 'days').format().slice(0,-6) + '.000Z';
  var beforeDay = startofMonth.add(0-startofMonth.day(), 'days').format().slice(0,-6) + '.000Z';
  Event.find({$and: [{date: {$lte: afterDay}}, {date: {$gte: beforeDay}}, {"archive": false}]}, function(err, events) {
    if(err) throw err;
    let sortedEvents = quickSort(events, 0, events.length-1);
    startofMonth = moment({year: req.body.currentYear, month: req.body.currentMonth});
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var info = {events: sortedEvents, month: months[req.body.currentMonth], year: req.body.currentYear, thisMonth: moment({year: req.body.currentYear, month: req.body.currentMonth}).daysInMonth(), lastMonth: moment({year: req.body.currentYear, month: req.body.currentMonth}).add(-1, 'month').daysInMonth(), lastMonthStart: startofMonth.add(0-startofMonth.day(), 'days').date()};
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
      res.send({"info": info, "subscribedBoards": req.user.subscribedBoards, admin: req.user.admin});
    });
  } else {
    res.redirect('/');
  }
});

router.get('/events/past', function(req, res) {
  if(req.user) {
    Event.find({$and: [{date: {$lte: moment(Date.now()).tz("America/New_York").startOf('day').format().slice(0,-6) + '.000Z'}, archive: false}]}).populate('board').exec(function(err, events) {
      let sortedEvents = quickSort(events, 0, events.length-1).reverse();
      console.log(sortedEvents);
      let eventObjects = sortedEvents.filter(function(event) {
        if(event.endTime) {
          var endTime = moment(event.endTime).utc().format('h:mm a');
        } else {
          var endTime = "";
        }
        if(moment(Date.now()).tz("America/New_York").format('MMMM D, YYYY')==moment(event.date).utc().format('MMMM D, YYYY') && (endTime > moment(Date.now()).tz("America/New_York").format('h:mm a') || moment(event.startTime).utc().format('h:mm a') > moment(Date.now()).tz("America/New_York").format('h:mm a'))) {
          return false;
        }
        return true;
      }).map(async function(event) {
        if(event.endTime) {
          var endTime = moment(event.endTime).utc().format('h:mm a');
        } else {
          var endTime = "";
        }
        if(event.postingGroup) {
          var user = await Group.findById(event.postingGroup);
              let eventObject= {
                  "id": event._id,
                  "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
                  "title": event.title,
                  "postingGroup": {
                    "id": user._id,
                    "name": user.name,
                    "isLoopUser": true
                  },
                  "board": {
                    "id": event.board._id,
                    "name": event.board.name
                  },
                  "archive": event.archive,
                  "description": event.description,
                  "date": moment(event.date).utc().format('MMMM D, YYYY'),
                  "startTime": moment(event.startTime).utc().format('h:mm a'),
                  "endTime": endTime,
                  "location": event.location,
                  "currentDate": moment(Date.now()).tz("America/New_York").format('MMMM D, YYYY'),
                  "currentTime": moment(Date.now()).tz("America/New_York").format('h:mm a')
                }
                return Promise.resolve(eventObject);
        } else if(event.postingOffice) {
          var user = await Office.findById(event.postingOffice);
              let eventObject= {
                  "id": event._id,
                  "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
                  "title": event.title,
                  "postingOffice": {
                    "id": user._id,
                    "name": user.name,
                    "isLoopUser": true
                  },
                  "board": {
                    "id": event.board._id,
                    "name": event.board.name
                  },
                  "archive": event.archive,
                  "description": event.description,
                  "date": moment(event.date).utc().format('MMMM D, YYYY'),
                  "startTime": moment(event.startTime).utc().format('h:mm a'),
                  "endTime": endTime,
                  "location": event.location,
                  "currentDate": moment(Date.now()).tz("America/New_York").format('MMMM D, YYYY'),
                  "currentTime": moment(Date.now()).tz("America/New_York").format('h:mm a')
                }
                return Promise.resolve(eventObject);
        } else {
          var user = await User.findOne({username: event.contact});
          if(user) {
              let eventObject= {
                  "id": event._id,
                  "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
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
                  "startTime": moment(event.startTime).utc().format('h:mm a'),
                  "endTime": endTime,
                  "location": event.location,
                  "currentDate": moment(Date.now()).tz("America/New_York").format('MMMM D, YYYY'),
                  "currentTime": moment(Date.now()).tz("America/New_York").format('h:mm a')
                }
                return Promise.resolve(eventObject);
          } else {
            let eventObject= {
              "id": event._id,
              "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
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
              "startTime": moment(event.startTime).utc().format('h:mm a'),
              "endTime": endTime,
              "location": event.location,
              "currentDate": moment(Date.now()).tz("America/New_York").format('MMMM D, YYYY'),
              "currentTime": moment(Date.now()).tz("America/New_York").format('h:mm a')
            }
            return Promise.resolve(eventObject);
          }
        }
      })
      Promise.all(eventObjects).then(function(events) {
        res.render("past-events", {events: events, admin: req.user.admin, helpers: {
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
    if(req.user.blocked) {
      res.redirect('/');
    } else {
      Board.find({}, function(err, boards) {
        if(err) throw err;
        var info = [];
        for(var i=0; i<boards.length; i++) {
    			if(boards[i].archive==false && req.user.viewBlockedBoards.indexOf(boards[i]._id)==-1 && req.user.postBlockedBoards.indexOf(boards[i]._id)==-1) {
            if(req.user.admin) {
              info.push({"name": boards[i].name, "_id": boards[i]._id, "active": boards[i].active});
            } else {
              if(boards[i].private==false && boards[i].create==true)
              info.push({"name": boards[i].name, "_id": boards[i]._id, "active": boards[i].active});
            }
    			}
    		}
        User.findById(req.user._id).populate('adminGroups').populate('office').exec(function(err, user) {
          if(err) throw err;
          var adminGroups = []
          for(var i=0; i<user.adminGroups.length; i++) {
            if(user.adminGroups[i].archive==false && user.adminGroups[i].active==true) {
              adminGroups.push(user.adminGroups[i]);
            }
          }
          Tag.find({}, function(err, tags) {
            if(err) throw err;
            res.render("create-a-new-event", {tags: tags, boards: info, admin: req.user.admin, groups: adminGroups, office: user.office});
          })
        })
      })
    }
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
  var postAs = encodeURIComponent(req.body.postAs);
  var tags = encodeURIComponent(req.body.tags)
  res.redirect('/create-a-new-event-invite/?title=' + title + '&description=' + description + '&board=' + board + '&startTime=' + startTime + '&endTime=' + endTime + '&location=' + location + '&date=' + date + '&contact=' + contact + '&postAs=' + postAs + '&tags=' + tags);
})

router.get('/create-a-new-event-invite', function(req, res) {
  if(req.user) {
    User.find({}, function(err, users) {
      if(err) throw err;
      var user_info = [];
      for(var i=0; i<users.length; i++) {
        if(req.user.username!=users[i].username) {
          user_info.push({"firstName": users[i].firstName, "lastName": users[i].lastName, "username": users[i].username, "major": users[i].major, "classYear": users[i].classYear, "title": users[i].title, "division": users[i].division});
        }
      }
      Group.find({}, function(err, groups) {
        res.render('create-a-new-event-invite', {tags: req.query.tags, admin: req.user.admin, title: req.query.title, description: req.query.description, board: req.query.board, date: req.query.date, startTime: req.query.startTime, endTime: req.query.endTime, location: req.query.location, contact: req.query.contact, postAs: req.query.postAs, users: user_info, groups: groups});
      })
    })
  } else {
    res.redirect('/');
  }
})
//Create a new event
router.post('/events/create', function(req, res) {
  var start = moment(req.body.startTime, "HH:mm").tz("America/New_York");
  var end = moment(req.body.endTime, "HH:mm").tz("America/New_York");
  var startTime = moment(req.body.date).utc().add(start.get('hour'), 'hour').add(start.get('minute'), 'minute');
  var endTime = moment(req.body.date).utc().add(end.get('hour'), 'hour').add(end.get('minute'), 'minute');
  var difference = moment(req.body.date).utc().get('hour') - moment(req.body.date).tz("America/New_York").get('hour');
  startTime.add(-difference, 'hour');
  endTime.add(-difference, 'hour');
  var addMembers = req.body.addMembers.split(',');
  var removeMembers = req.body.removeMembers.split(',');
  var addGroups = req.body.addGroups.split(',');
  var removeGroups = req.body.removeGroups.split(',');
  for(var i=0; i<removeMembers.length; i++) {
    for(var j=0; j<addMembers.length; j++) {
      if(removeMembers[i]==addMembers[j]) {
        addMembers.splice(j, 1);
      }
    }
  }
  for(var i=0; i<removeGroups.length; i++) {
    for(var j=0; j<addGroups.length; j++) {
      if(removeGroups[i]==addGroups[j]) {
        addGroups.splice(j, 1);
      }
    }
  }
  var tagsList = req.body.tags.split(',');
  let tags = tagsList.map(async function(tag) {
    if (tag.match(/^[0-9a-fA-F]{24}$/)) {
      let foundTag = await Tag.findById(tag);
      if(foundTag) {
        if(foundTag.numberContent) {
          foundTag.numberContent++;
          return foundTag.save();
        } else {
          foundTag.numberContent = 1;
          return foundTag.save();
        }
      }
    } else if(tag!=""){
      let newTag = new Tag({
        name: tag,
        followers: [req.user._id],
        numberContent: 1
      })
      return newTag.save();
    }
  })
  Promise.all(tags).then(function(tags) {
    var promiseEvent = new Promise(function(resolve, reject) {
      if(req.body.postAs=="self") {
        var newEvent = new Event({
          title: req.body.title,
      		description: req.body.description,
          board: req.body.board,
          startTime: startTime,
          endTime: endTime,
          location: req.body.location,
          date: req.body.date,
      		contact: req.user.username,
          tags: tags,
          attendees: [req.user._id]
        });
        resolve(newEvent);
      } else {
        Office.findById(req.body.postAs, function(err, office) {
          if(office) {
            var newEvent = new Event({
              title: req.body.title,
          		description: req.body.description,
              board: req.body.board,
              startTime: startTime,
              endTime: endTime,
              location: req.body.location,
              date: req.body.date,
          		contact: req.user.username,
              tags: tags,
              attendees: [req.user._id],
              postingOffice: req.body.postAs,
              onOfficePage: true
            });
            resolve(newEvent);
          } else {
            var newEvent = new Event({
              title: req.body.title,
          		description: req.body.description,
              board: req.body.board,
              startTime: startTime,
              endTime: endTime,
              location: req.body.location,
              date: req.body.date,
          		contact: req.user.username,
              tags: tags,
              attendees: [req.user._id],
              postingGroup: req.body.postAs,
              onGroupPage: true
            });
            resolve(newEvent);
          }
        })
      }
    })
    promiseEvent.then(function(newEvent) {
      newEvent.save(function(error, newEvent) {
        if (error) throw error;
        User.findById(req.user._id, function(error, user) {
          if (error) throw error;
    			user.attendedEvents.push(newEvent._id);
          user.validateSync();
          user.save(function(error, updatedUser) {
            if (error) throw error;
    				Board.findById(newEvent.board, function(err, board) {
    					if (err) throw err;
    					board.contents.push({"kind": "Event", "item": newEvent._id});
    					board.save(function(err, updatedBoard) {
    						if(err) throw err;
                Group.find({'_id': addGroups}, function(err, groups) {
                  let foundGroups = groups.map(async function(group) {
                    var newNotification = new Notification({
                      type: 'Invited to Event',
                      message: "The Organization, " + group.name + ", that you are part of has been invited to a new Event, " + newEvent.title + ".",
                      routeID: {
                        kind: 'Event',
                        id: newEvent._id,
                        boardId: newEvent.board
                      }
                    })
                    newNotification.save(function(err, groupNotification) {
                      if(err) throw err;
                      User.find({'_id': group.members}, function(err, groupMembers) {
                        if(err) throw err;
                        for(var i=0; i<groupMembers.length; i++) {
                          groupMembers[i].notifications.push(groupNotification._id);
                          groupMembers[i].save(function(err, savedMember) {
                            if(err) throw err;
                            console.log("saved notification");
                          })
                        }
                        return groupMembers;
                      })
                    })
                  })
                  Promise.all(foundGroups).then(function(groupMembers) {
                    User.find({$and: [{'username': addMembers}, {'_id': {$nin: groupMembers}}]}, function(err, members) {
                      if(err) throw err;
                      var newNotification = new Notification({
                        type: 'Invited to Event',
                        message: "You have been invited to a new Event, " + newEvent.title + ".",
                        routeID: {
                          kind: 'Event',
                          id: newEvent._id,
                          boardId: newEvent.board
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
            return {"own": comment.postedBy._id.toString() === req.user._id.toString(), "id": comment._id, "createdAt": moment(comment.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'), "postedBy": {"id": comment.postedBy._id, "firstName": comment.postedBy.firstName, "lastName": comment.postedBy.lastName}, "text": comment.text, "flagged": comment.flagged}
          })
          if(event.endTime) {
            var endTime = moment(event.endTime).utc().format('h:mm a');
          } else {
            var endTime = "";
          }
          if(event.postingGroup) {
            Group.findById(event.postingGroup, function(err, user) {
              if(err) throw err;
              if(user) {
                var eventObject = {
                  "own": event.contact.toString() === req.user.username.toString(),
                  "id": event._id,
                  "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
                  "postingGroup": {
                    "id": user._id,
                    "name": user.name,
                    "isLoopUser": true
                  },
                  "title": event.title,
                  "board": event.board,
                  "archive": event.archive,
                  "date": moment(event.date).utc().format('MMMM D, YYYY'),
                  "startTime": moment(event.startTime).utc().format('h:mm a'),
                  "endTime": endTime,
                  "location": event.location,
                  "description": event.description,
                  "flagged": event.flagged,
                  "comments": comments,
                  "attendees": attendees,
                  "attending": attending
                }
              }
              res.render('event-detail', {"event": eventObject, "board": board.name, admin: req.user.admin, helpers: {
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
          } else if(event.postingOffice) {
            Office.findById(event.postingOffice, function(err, user) {
              if(err) throw err;
              if(user) {
                var eventObject = {
                  "own": event.contact.toString() === req.user.username.toString(),
                  "id": event._id,
                  "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
                  "postingOffice": {
                    "id": user._id,
                    "name": user.name,
                    "isLoopUser": true
                  },
                  "title": event.title,
                  "board": event.board,
                  "archive": event.archive,
                  "date": moment(event.date).utc().format('MMMM D, YYYY'),
                  "startTime": moment(event.startTime).utc().format('h:mm a'),
                  "endTime": endTime,
                  "location": event.location,
                  "description": event.description,
                  "flagged": event.flagged,
                  "comments": comments,
                  "attendees": attendees,
                  "attending": attending
                }
              }
              res.render('event-detail', {"event": eventObject, "board": board.name, admin: req.user.admin, helpers: {
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
          } else {
            User.findOne({"username": event.contact}, function(err, user) {
              if(err) throw err;
              if(user) {
                var eventObject = {
                  "own": user._id.toString() === req.user._id.toString(),
                  "id": event._id,
                  "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
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
                  "startTime": moment(event.startTime).utc().format('h:mm a'),
                  "endTime": endTime,
                  "location": event.location,
                  "description": event.description,
                  "flagged": event.flagged,
                  "comments": comments,
                  "attendees": attendees,
                  "attending": attending
                }
              } else {
                var eventObject = {
                  "id": event._id,
                  "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
                  "postedBy": {
                    "username": event.contact,
                    "isLoopUser": false
                  },
                  "title": event.title,
                  "board": event.board,
                  "archive": event.archive,
                  "date": moment(event.date).utc().format('MMMM D, YYYY'),
                  "startTime": moment(event.startTime).utc().format('h:mm a'),
                  "endTime": endTime,
                  "location": event.location,
                  "description": event.description,
                  "flagged": event.flagged,
                  "comments": comments,
                  "attendees": attendees,
                  "attending": attending
                }
              }
              res.render('event-detail', {"event": eventObject, "board": board.name, admin: req.user.admin, helpers: {
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
          }
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
    Event.find({$and: [{date: {$gte: moment(Date.now()).tz("America/New_York").startOf('day').format().slice(0,-6) + '.000Z'}, archive: false}]}).populate('board').exec(function(err, events) {
      if(err) throw err;
  			let sortedEvents = quickSort(events, 0, events.length-1);
  			let eventObjects = sortedEvents.map(async function(event) {
          var user = await User.findOne({username: event.contact});
          if(event.endTime) {
            var endTime = moment(event.endTime).utc().format('h:mm a');
          } else {
            var endTime = "";
          }
          if(event.postingGroup) {
            var user = await Group.findById(event.postingGroup);
                let eventObject= {
                    "id": event._id,
                    "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
                    "title": event.title,
                    "postingGroup": {
                      "id": user._id,
                      "name": user.name,
                      "isLoopUser": true
                    },
                    "board": {
                      "id": event.board._id,
                      "name": event.board.name
                    },
                    "archive": event.archive,
                    "description": event.description,
                    "date": moment(event.date).utc().format('MMMM D, YYYY'),
                    "startTime": moment(event.startTime).utc().format('h:mm a'),
                    "endTime": endTime,
                    "location": event.location,
                    "currentDate": moment(Date.now()).tz("America/New_York").format('MMMM D, YYYY'),
                    "currentTime": moment(Date.now()).tz("America/New_York").format('h:mm a')
                  }
                  return Promise.resolve(eventObject);
          } else if(event.postingOffice) {
            var user = await Office.findById(event.postingOffice);
                let eventObject= {
                    "id": event._id,
                    "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
                    "title": event.title,
                    "postingOffice": {
                      "id": user._id,
                      "name": user.name,
                      "isLoopUser": true
                    },
                    "board": {
                      "id": event.board._id,
                      "name": event.board.name
                    },
                    "archive": event.archive,
                    "description": event.description,
                    "date": moment(event.date).utc().format('MMMM D, YYYY'),
                    "startTime": moment(event.startTime).utc().format('h:mm a'),
                    "endTime": endTime,
                    "location": event.location,
                    "currentDate": moment(Date.now()).tz("America/New_York").format('MMMM D, YYYY'),
                    "currentTime": moment(Date.now()).tz("America/New_York").format('h:mm a')
                  }
                  return Promise.resolve(eventObject);
          } else {
            var user = await User.findOne({username: event.contact});
            if(user) {
                let eventObject= {
                    "id": event._id,
                    "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
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
                    "startTime": moment(event.startTime).utc().format('h:mm a'),
                    "endTime": endTime,
                    "location": event.location,
                    "currentDate": moment(Date.now()).tz("America/New_York").format('MMMM D, YYYY'),
                    "currentTime": moment(Date.now()).tz("America/New_York").format('h:mm a')
                  }
                  return Promise.resolve(eventObject);
            } else {
              let eventObject= {
                "id": event._id,
                "createdAt": moment(event.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
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
                "startTime": moment(event.startTime).utc().format('h:mm a'),
                "endTime": endTime,
                "location": event.location,
                "currentDate": moment(Date.now()).tz("America/New_York").format('MMMM D, YYYY'),
                "currentTime": moment(Date.now()).tz("America/New_York").format('h:mm a')
              }
              return Promise.resolve(eventObject);
            }
          }
        })
        Promise.all(eventObjects).then(function(events) {
          console.log(events);
            Board.find({}, function(err, boards) {
              if(err) throw err;
              var info = [];
              for(var i=0; i<boards.length; i++) {
          			if(boards[i].archive==false && req.user.viewBlockedBoards.indexOf(boards[i]._id)==-1 && req.user.postBlockedBoards.indexOf(boards[i]._id)==-1) {
                  if(req.user.admin) {
                    info.push({"name": boards[i].name, "_id": boards[i]._id, "active": boards[i].active});
                  } else {
                    if(boards[i].private==false && boards[i].create==true)
                    info.push({"name": boards[i].name, "_id": boards[i]._id, "active": boards[i].active});
                  }
          			}
          		}
              User.findById(req.user._id).populate('adminGroups').populate('office').exec(function(err, user) {
                if(err) throw err;
                var adminGroups = []
                for(var i=0; i<user.adminGroups.length; i++) {
                  if(user.adminGroups[i].archive==false && user.adminGroups[i].active==true) {
                    adminGroups.push(user.adminGroups[i]);
                  }
            		}
                Tag.find({}, function(err, tags) {
                  if(err) throw err;
                  res.render('events-list-view', {blocked: req.user.blocked, tags: tags, groups: adminGroups, office: user.office, events: events, boards: info, admin: req.user.admin, helpers: {
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
      var startTime = moment(event.startTime).utc().format("HH:mm");
      if(event.endTime) {
        var endTime = moment(event.endTime).utc().format("HH:mm");
      } else {
        var endTime = "";
      }
      res.render('edit-event', {event: event, date: date, startTime: startTime, endTime: endTime, admin: req.user.admin});
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
									id: event._id,
                  boardId: event.board
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
router.post('/events/:id/unflag', function(req, res) {
	Event.findById(req.params.id, function(err, event) {
		event.flagged = false;
		event.save(function(err, updatedEvent) {
			Board.findById(updatedEvent.board).populate('notifications').exec(function(err, board) {
				for(var i=0; i<board.notifications.length; i++) {
					if(board.notifications[i].routeID.id.toString() == updatedEvent._id.toString()) {
						board.notifications.splice(i, 1);
						board.save(function(err, updatedBoard) {
							res.redirect('/boards/' + updatedBoard._id);
						})
					}
				}
			})
		})
	})
})

router.post('/events/:id/delete', function(req, res) {
	Event.findById(req.params.id, function(err, event) {
		if (err) {
			throw err;
		} else {
			event.archive=true;
			event.save(function(err, updatedEvent) {
				Board.findOneAndUpdate({_id: updatedEvent.board}, {$pull: {contents: {item: req.params.id}}}).populate('notifications').exec(function(err, board) {
					if (err) {
						throw err;
					} else {
						for(var i=0; i<board.notifications.length; i++) {
							if(board.notifications[i].routeID.id.toString() == updatedEvent._id.toString()) {
								board.notifications.splice(i, 1);
								board.save(function(err, updatedBoard) {
									res.redirect('/boards/' + updatedBoard._id);
								})
							}
						}
					}
				})
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
    								id: post._id,
                    boardId: post.board
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
    								id: post._id,
                    boardId: post.board
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
    											id: post._id,
                          boardId: post.board
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
                  id: post._id,
                  boardId: post.board
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
    user.validateSync();
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
					res.redirect('back');
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
    user.validateSync();
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
					res.redirect('back');
				})
			})
		})
	})
})

module.exports = router;
