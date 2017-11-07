var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/user');
var Board = require('../models/board');
var Event = require('../models/event');
var Comment = require('../models/comment');
var Notification = require('../models/notification');


module.exports = function(passport) {
	router.put('/events/:id', passport.authenticate('jwt', { session: false }), function(req, res) {
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

  router.delete('/events/:id', passport.authenticate('jwt', { session: false }), function(req, res) {
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

  router.post('/events/:id/comment', passport.authenticate('jwt', { session: false }), function(req, res) {
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

  return router;
}