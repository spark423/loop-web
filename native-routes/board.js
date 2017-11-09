var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var Board = require('../models/board');
var Post = require('../models/post');
var User = require('../models/user');
var Event = require('../models/event');

module.exports = function(passport) {
  router.get('/boards', passport.authenticate('jwt', { session: false }), function(req, res) {
    Board.find({}, function(err, boards) {
      if (err) {
        throw err;
      } else {
        let boardsArr = boards.map(function(board) {
          return {"id": board._id, "name": board.name, "unsubscribable": board.unsubscribable, "subscribed": req.user.subscribedBoards(board._id) > -1};
        })
        res.json({"boards": boardsArr});
      }
    })
  })

  router.get('/boards/:id', passport.authenticate('jwt', { session: false }), function(req, res) {
    Board.findById(req.params.id).populate([{path: 'contents.item', populate: [{path: 'postedBy'}, {path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]}]).exec(function(err, board) {
      if (err) {
        throw err;
      } else if (board.private) {
        let contents = board.contents.reverse().map(async function(content) {
          if (content.postedBy === req.user._id.toString()) {
            let item = content.item;
            let kind = content.kind;
            let comments = [];
            for (let j=0; j<item.comments.length; j++) {
              let comment = item.comments[j];
              let commentOfComments = comment.comments.map(function(commentOfComment) {
                return {"id": commentOfComment._id, "createdAt": commentOfComment.createdAt, "postedBy": {"id": commentOfComment.postedBy._id, "firstName": commentOfComment.postedBy.firstName, "lastName": commentOfComment.postedBy.lastName}, "text": commentOfComment.text}
              })
              comments.push({
                "id": comment._id,
                "createdAt": comment.createdAt,
                "postedBy": {
                  "id": comment.postedBy._id,
                  "firstName": comment.postedBy.firstName,
                  "lastName": comment.postedBy.lastName
                },
                "text": comment.text,
                "comments": commentOfComments
              });
            }        
            if (kind == 'Post') {
              let postCreator = await User.findById(item.postedBy);
              let postObject = {
                "own": req.user._id.toString() === postCreator._id.toString(),
                "following": req.user.followingPosts.indexOf(item._id) > -1,
                "id": item._id,
                "createdAt": item.createdAt,
                "postedBy": {
                  "id": postCreator._id,
                  "firstName": postCreator.firstName,
                  "lastName": postCreator.lastName,
                  "postCreator": postCreator.username,
                  "isLoopUser": true
                },    
                "title": item.title,
                "text": item.text,
                "comments": comments
              }               
              return Promise.resolve(postObject)
            } else {
              let attendees = item.attendees.map(function(attendee) {
                return {"id": attendee._id, "firstName": attendee.firstName, "lastName": attendee.lastName}
              })
              let eventCreator = await User.findOne({username: item.contact});
              if (eventCreator) {
                let eventObject = {
                  "own": req.user.username === item.postedBy,
                  "attending": req.user.attendedEvents.indexOf(item._id) > -1,               
                  "id": item._id,
                  "createdAt": item.createdAt,
                  "postedBy": {
                    "id": eventCreator._id,
                    "firstName": eventCreator.firstName,
                    "lastName": eventCreator.lastName,
                    "username": eventCreator.username,
                    "isLoopUser": true
                  },  
                  "title": item.title,
                  "date": item.date,
                  "startTime": item.startTime,
                  "endTime": item.endTime,
                  "location": item.location,
                  "description": item.description,              
                  "comments": comments,
                  "attendees": attendees
                }
                return Promise.resolve(eventObject);              
              } else {
                let eventObject = {
                  "own": req.user.username === item.postedBy,
                  "attending": req.user.attendedEvents.indexOf(item._id) > -1,               
                  "id": item._id,
                  "createdAt": item.createdAt,
                  "postedBy": {
                    "id": "",
                    "firstName": "",
                    "lastName": "",
                    "username": item.contact,
                    "isLoopUser": false
                  },  
                  "title": item.title,
                  "date": item.date,
                  "startTime": item.startTime,
                  "endTime": item.endTime,
                  "location": item.location,
                  "description": item.description,              
                  "comments": comments,
                  "attendees": attendees
                };
                return Promise.resolve(eventObject);
              }
            }
          }
        });
        Promise.all(contents).then(function(contents) {       
          res.json({
            board: {
              id: board._id,
              create: board.create,
              unsubscribable: board.unsubscribable,
              name: board.name,
              description: board.description,
              contents: contents
            }
          })
        })
      } else {
        let contents = board.contents.reverse().map(async function(content) {
          let item = content.item;
          let kind = content.kind;
          let comments = [];
          for (let j=0; j<item.comments.length; j++) {
            let comment = item.comments[j];
            let commentOfComments = comment.comments.map(function(commentOfComment) {
              return {"id": commentOfComment._id, "createdAt": commentOfComment.createdAt, "postedBy": {"id": commentOfComment.postedBy._id, "firstName": commentOfComment.postedBy.firstName, "lastName": commentOfComment.postedBy.lastName}, "text": commentOfComment.text}
            })
            comments.push({
              "id": comment._id,
              "createdAt": comment.createdAt,
              "postedBy": {
                "id": comment.postedBy._id,
                "firstName": comment.postedBy.firstName,
                "lastName": comment.postedBy.lastName
              },
              "text": comment.text,
              "comments": commentOfComments
            });
          }        
          if (kind == 'Post') {
            let postCreator = await User.findById(item.postedBy);
            let postObject = {
              "own": req.user._id.toString() === postCreator._id.toString(),
              "following": req.user.followingPosts.indexOf(item._id) > -1,
              "id": item._id,
              "createdAt": item.createdAt,
              "postedBy": {
                "id": postCreator._id,
                "firstName": postCreator.firstName,
                "lastName": postCreator.lastName
              },
              "title": item.title,
              "text": item.text,
              "comments": comments
            }               
            return Promise.resolve(postObject)
          } else {
            let attendees = item.attendees.map(function(attendee) {
              return {"id": attendee._id, "firstName": attendee.firstName, "lastName": attendee.lastName}
            })
            let eventCreator = await User.findOne({username: item.contact});
            if (eventCreator) {
              let eventObject = {
                "own": req.user.username === item.postedBy,
                "attending": req.user.attendedEvents.indexOf(item._id) > -1,               
                "id": item._id,
                "createdAt": item.createdAt,
                "postedBy": {
                  "id": eventCreator._id,
                  "firstName": eventCreator.firstName,
                  "lastName": eventCreator.lastName
                },
                "title": item.title,
                "date": item.date,
                "startTime": item.startTime,
                "endTime": item.endTime,
                "location": item.location,
                "description": item.description,              
                "comments": comments,
                "attendees": attendees
              }
              return Promise.resolve(eventObject);              
            } else {
              let eventObject = {
                "own": req.user.username === item.postedBy,
                "attending": req.user.attendedEvents.indexOf(item._id) > -1,               
                "id": item._id,
                "createdAt": item.createdAt,
                "postedBy": item.contact,
                "title": item.title,
                "date": item.date,
                "startTime": item.startTime,
                "endTime": item.endTime,
                "location": item.location,
                "description": item.description,              
                "comments": comments,
                "attendees": attendees
              };
              return Promise.resolve(eventObject);
            }
          }
        });
        Promise.all(contents).then(function(contents) {       
          res.json({
            board: {
              id: board._id,
              create: board.create,
              unsubscribable: board.unsubscribable,
              name: board.name,
              description: board.description,
              contents: contents
            }
          })
        })
      }
    })
  });
  
  router.post('/boards/:id/post', passport.authenticate('jwt', { session: false }), function(req, res) {
  	let newPost = new Post({
      postedBy: req.user._id,
      board: req.params.id,
      title: req.body.title,
      text: req.body.text
    })
    newPost.save(function(err, newPost) {
    	if (err) {
        throw err;
      }
      Board.findOneAndUpdate({_id: req.params.id}, {$push: {contents: {"kind": "Post", "item": newPost._id}}}, function(err) {
        if (err) {
          throw err;
        }
        User.findOneAndUpdate({_id: req.user._id}, {$push: {posts: newPost._id}}, function(err) {
          if (err) {
            throw err;
          }
          res.json({success: true})
        })
      });
    });
  })

  return router;
}
