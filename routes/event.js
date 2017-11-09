var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Event = require('../models/event');
var Comment = require('../models/comment');
var Notification = require('../models/notification')

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

router.post('/events/create', function(req, res) {
  var deleteFiles = req.body.deleteFiles.split(" ");
  deleteFiles.splice(deleteFiles.length-1, 1);
  for(var i=0; i<deleteFiles.length; i++) {
    for(var j=0; j<req.files.images.length; j++) {
      if(req.files.images[j].name == deleteFiles[i]) {
        req.files.images.splice(j,1);
        break;
      }
    }
  }
  if(req.files.images && req.files.images != '') {
    imgProc.convertImgs(req.files.images).then((imageStringArray)=>{
      var newEvent = new Event({
        postedBy: req.user._id,
        name: req.body.name,
        board: req.body.board,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        location: req.body.location,
        text: req.body.text,
        date: req.body.date,
        images: imageStringArray
      });
      var newNotification = new Notification({
        recipient: req.user._id,
        message: 'Your event has been made on Loop. Please assign it to a board.'
      })
      newEvent.save(function(error, newEvent) {
        if (error)
          throw error;
        newNotification.save(function(error, newNotification) {
          if (error)
            throw error;
          User.findById(req.user._id, function(error, user) {
            if (error)
              throw error;
            user.createdEvents.push(newEvent._id)
            user.notifications.push(newNotification._id)
            user.save(function(error, updatedUser) {
              if (error)
                throw error
              Board.findById(newEvent.board, function(error, board) {
                if (error)
                  throw error
                board.events.push(newEvent._id);
                board.save(function(error, updatedBoard) {
                  if (error)
                    throw error
                  res.redirect('/boards/'+updatedBoard._id)
                })
              })
            })
          })
        })
      })
    });
  } else {
    var newEvent = new Event({
      postedBy: req.user._id,
      name: req.body.name,
      board: req.body.board,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      location: req.body.location,
      text: req.body.text,
      date: req.body.date
    })
    console.log(newEvent);
    var newNotification = new Notification({
      recipient: req.user._id,
      message: 'Your event has been made on Loop. Please assign it to a board.'
    })
    newEvent.save(function(error, newEvent) {
      if (error)
        throw error;
      newNotification.save(function(error, newNotification) {
        if (error)
          throw error;
        User.findById(req.user._id, function(error, user) {
          if (error)
            throw error;
          user.createdEvents.push(newEvent._id)
          user.notifications.push(newNotification._id)
          user.save(function(error, updatedUser) {
            if (error)
              throw error
            Board.findById(newEvent.board, function(error, board) {
              if (error)
                throw error
              board.events.push(newEvent._id);
              board.save(function(error, updatedBoard) {
                if (error)
                  throw error
                res.redirect('/boards/'+updatedBoard._id)
              })
            })
          })
        })
      })
    })
  }
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
router.delete('/events/:id', function(req, res) {
	Event.findById(req.params.id, function(err, event) {
		if (err)  {
			throw err;
		} else {
			Board.findOneAndUpdate({_id: event.board}, {$pull: {contents: {item: req.params.id}}}, function(err) {
				if (err) {
					throw err;
				} else {
					res.json({success: true});
				}
			})
		}
	})
})
/*
router.post('/events/:id/delete-event', function(req, res) {
	Event.findById(req.params.id, function(error, event) {
		if (error)
			throw error;
		Board.findOne({name: 'Event'}, function(error, board) {
			if (error)
				throw error;
			var boardEvents = board.events
			var index = boardEvents.indexOf(event._id)
			board.events = boardEvents.slice(0, index).concat(boardEvents.slice(index+1, boardEvents.length))
			board.save(function(error, updatedBoard) {
				if (error)
					throw error;
				res.redirect('/boards/'+updatedBoard._id)
			})
		})
	})
})
*/

//Commenting on event
router.post('/events/:id/comment', function(req, res) {
	let newComment = new Comment({
		postedBy: req.user._id,
		source: {"kind": 'Event', "item": req.params.id},
		text: req.body.text
	})
	newComment.save(function(err, newComment) {
		if (err) {
			throw err;
		}
		Event.findOneAndUpdate({_id: req.params.id}, {$push: {comments: newComment._id}}, function(err) {
			if (err) {
				throw err;
			}
			User.findOneAndUpdate({_id: req.user._id}, {$push: {comments: newComment._id}}, function(err) {
				if (err) {
					throw err;
				}
				res.json({success: true})
			})
		});
	})
})
/*
router.post('/events/:id/comment', function(req, res) {
	var newComment = new Comment({
		postedBy: {"name": req.user.firstName + " " + req.user.lastName, "_id": req.user._id},
		event: req.params.id,
		text: req.body.text
	})
	newComment.save(function(error, newComment) {
		User.findById(req.user._id, function(error, user) {
			if (error)
				throw error;
			user.comments.push(newComment._id)
			user.save(function(error, updatedUser) {
				if (error)
					throw error;
		    Event.findById(newComment.event, function(error, event) {
		      if (error)
				    throw error;
			    event.comments.push(newComment._id)
	        event.save(function(error, updatedEvent) {
				    if (error)
				      throw error;
		       res.redirect('back')
	        })
	      })
			})
		})
	})
})
*/


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
