var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group')
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Challenge = require('../models/challenge')
var Notification = require('../models/notification')
var moment = require('moment')
var Jimp = require('jimp')
var fs = require('fs')
var multer = require('multer')
var upload = multer();
var imgProc = require('./images')

router.get('/boardinfo', function(req, res) {
  Board.find({}, function(err, boards) {
    if(err) throw err;
    var info = [];
    for(var i=0; i<boards.length; i++) {
      info.push({"name": boards[i].name, "_id": boards[i]._id});
    }
    res.send(info);
  });
});
//Retrieving a board page
router.get('/boards/:id', function(req, res) {
  User.findById(req.user._id).populate('adminGroups').exec(function(error, user) {
    //Need this to allow users to post as groups that they are admins of
    if (error)
      throw error;
    console.log("admin groups", user.adminGroups)
    Board.findById(req.params.id).populate({path: 'events', populate: [{path: 'postedBy', model: 'User'}, {path: 'attendees', model: 'User'}, {path: 'comments', populate: [{path: 'postedBy', model: 'User'}, {path: 'comments', populate: [{path: 'postedBy', model: 'User'}]}]}]}).populate({path: 'posts', populate: [{path: 'postedBy', model: 'User'}, {path: 'postingGroup', model: 'Group'}, {path: 'comments', populate: [{path: 'postedBy', model: 'User'}, {path: 'comments', populate: [{path: 'postedBy', model: 'User'}]}]}]}).exec(function(error, board) {
      var events = []
      for (var i=0; i<board.events.length; i++) {
        var comments = []
        for (var j=0; j<board.events[board.events.length-1-i].comments.length; j++) {
          var commentsOfComments = []
          for (var k=0; k<board.events[board.events.length-1-i].comments[j].comments.length; k++) {
            if (req.user._id.toString() === board.events[board.events.length-1-i].comments[j].comments[k].postedBy._id.toString()) {
              commentsOfComments.push({ "own": true,
                                        "comment": {
                                        "_id": board.events[board.events.length-1-i].comments[j].comments[k]._id,
                                          "postedBy": {
                                            "_id": board.events[board.events.length-1-i].comments[j].comments[k].postedBy._id,
                                            "name": board.events[board.events.length-1-i].comments[j].comments[k].postedBy.firstName + " " + board.events[board.events.length-1-i].comments[j].comments[k].postedBy.lastName
                                          },
                                          "createdAt": moment(board.events[board.events.length-1-i].comments[j].comments[k].createdAt).format('LLL'),
                                          "text": board.events[board.events.length-1-i].comments[j].comments[k].text
                                        }
                                      })
            } else {
              commentsOfComments.push({ "own": false,
                                        "comment": {
                                          "_id": board.events[board.events.length-1-i].comments[j].comments[k]._id,
                                          "postedBy": {
                                            "_id": board.events[board.events.length-1-i].comments[j].comments[k].postedBy._id,
                                            "name": board.events[board.events.length-1-i].comments[j].comments[k].postedBy.firstName + " " + board.events[board.events.length-1-i].comments[j].comments[k].postedBy.lastName
                                          },
                                          "createdAt": moment(board.events[board.events.length-1-i].comments[j].comments[k].createdAt).format('LLL'),
                                          "text": board.events[board.events.length-1-i].comments[j].comments[k].text
                                        }
                                      })
            }
          }
          console.log("CommentsOfComments", commentsOfComments)
          if (req.user._id.toString() === board.events[board.events.length-1-i].comments[j].postedBy._id.toString()) {
            comments.push({ "own": true,
                            "comment": {
                              "_id": board.events[board.events.length-1-i].comments[j]._id,
                              "postedBy": {
                                "_id": board.events[board.events.length-1-i].comments[j].postedBy._id,
                                "name": board.events[board.events.length-1-i].comments[j].postedBy.firstName + " " + board.events[board.events.length-1-i].comments[j].postedBy.lastName
                              },
                              "createdAt": moment(board.events[board.events.length-1-i].comments[j].createdAt).format('LLL'),
                              "text": board.events[board.events.length-1-i].comments[j].text,
                              "comments": commentsOfComments
                            }
                          })
          } else {
            comments.push({ "own": false,
                            "comment": {
                              "_id": board.events[board.events.length-1-i].comments[j]._id,
                              "postedBy": {
                                "_id": board.events[board.events.length-1-i].comments[j].postedBy._id,
                                "name": board.events[board.events.length-1-i].comments[j].postedBy.firstName + " " + board.events[board.events.length-1-i].comments[j].postedBy.lastName
                              },
                              "createdAt": moment(board.events[board.events.length-1-i].comments[j].createdAt).format('LLL'),
                              "text": board.events[board.events.length-1-i].comments[j].text,
                              "comments": commentsOfComments
                            }
                          })
          }
        }
        console.log("Comments", comments)
        if (req.user._id.toString() === board.events[board.events.length-1-i].postedBy._id.toString() && req.user.attendedEvents.indexOf(board.events[board.events.length-1-i]._id.toString()) > -1) {
          events.push({ "own": true,
                        "attending": true,
                        "event": {
                          "_id": board.events[board.events.length-1-i]._id,
                          "name": board.events[board.events.length-1-i].name,
                          "postedBy":  {
                            "_id": board.events[board.events.length-1-i].postedBy._id,
                            "name": board.events[board.events.length-1-i].postedBy.firstName + " " + board.events[board.events.length-1-i].postedBy.lastName
                          },
                          "createdAt": moment(board.events[board.events.length-1-i].createdAt).format('LLL'),
                          "startTime": moment(board.events[board.events.length-1-i].startTime).format('LLL'),
                          "endTime": moment(board.events[board.events.length-1-i].startTime).format('LLL'),
                          "location": board.events[board.events.length-1-i].location,
                          "text": board.events[board.events.length-1-i].text,
                          "attendees": board.events[board.events.length-1-i].attendees,
                          "comments": comments
                        }
                      })
        } else if (req.user._id.toString() === board.events[board.events.length-1-i].postedBy._id.toString() && req.user.attendedEvents.indexOf(board.events[board.events.length-1-i]._id.toString()) === -1) {
          events.push({ "own": true,
                        "attending": false,
                        "event": {
                          "_id": board.events[board.events.length-1-i]._id,
                          "name": board.events[board.events.length-1-i].name,
                          "postedBy":  {
                            "_id": board.events[board.events.length-1-i].postedBy._id,
                            "name": board.events[board.events.length-1-i].postedBy.firstName + " " + board.events[board.events.length-1-i].postedBy.lastName
                          },
                          "createdAt": moment(board.events[board.events.length-1-i].createdAt).format('LLL'),
                          "startTime": moment(board.events[board.events.length-1-i].startTime, "HH:mm").format('LLL'),
                          "endTime": moment(board.events[board.events.length-1-i].endTime, "HH:mm").format('LLL'),
                          "location": board.events[board.events.length-1-i].location,
                          "text": board.events[board.events.length-1-i].text,
                          "attendees": board.events[board.events.length-1-i].attendees,
                          "comments": comments
                        }
                     })

        } else if (req.user._id.toString() !== board.events[board.events.length-1-i].postedBy._id.toString() && req.user.attendedEvents.indexOf(board.events[board.events.length-1-i]._id.toString()) > -1) {
          events.push({ "own": false,
                        "attending": true,
                        "event": {
                          "_id": board.events[board.events.length-1-i]._id,
                          "name": board.events[board.events.length-1-i].name,
                          "postedBy":  {
                            "_id": board.events[board.events.length-1-i].postedBy._id,
                            "name": board.events[board.events.length-1-i].postedBy.firstName + " " + board.events[board.events.length-1-i].postedBy.lastName
                          },
                          "createdAt": moment(board.events[board.events.length-1-i].createdAt).format('LLL'),
                          "startTime": moment(board.events[board.events.length-1-i].startTime).format('LLL'),
                          "endTime": moment(board.events[board.events.length-1-i].startTime).format('LLL'),
                          "location": board.events[board.events.length-1-i].location,
                          "text": board.events[board.events.length-1-i].text,
                          "attendees": board.events[board.events.length-1-i].attendees,
                          "comments": comments
                        }
                      })
        } else {
          events.push({ "own": false,
                        "attending": false,
                        "event": {
                          "_id": board.events[board.events.length-1-i]._id,
                          "name": board.events[board.events.length-1-i].name,
                          "postedBy":  {
                            "_id": board.events[board.events.length-1-i].postedBy._id,
                            "name": board.events[board.events.length-1-i].postedBy.firstName + " " + board.events[board.events.length-1-i].postedBy.lastName
                          },
                          "createdAt": moment(board.events[board.events.length-1-i].createdAt).format('LLL'),
                          "startTime": moment(board.events[board.events.length-1-i].startTime).format('LLL'),
                          "endTime": moment(board.events[board.events.length-1-i].startTime).format('LLL'),
                          "location": board.events[board.events.length-1-i].location,
                          "text": board.events[board.events.length-1-i].text,
                          "attendees": board.events[board.events.length-1-i].attendees,
                          "comments": comments
                        }
                      })
        }
      }
      var posts = []
      for (var i=0; i<board.posts.length; i++) {
        var comments = []
        for (var j=0; j<board.posts[board.posts.length - 1 -i].comments.length; j++) {
          var commentsOfComments = []
          for (var k=0; k<board.posts[board.posts.length -1 -i].comments[j].comments.length; k++) {
            if (req.user._id.toString() === board.posts[board.posts.length-1-i].comments[j].comments[k].postedBy._id.toString()) {
              commentsOfComments.push({ "own": true,
                                        "comment": {
                                        "_id": board.posts[board.posts.length-1-i].comments[j].comments[k]._id,
                                          "postedBy": {
                                            "_id": board.posts[board.posts.length-1-i].comments[j].comments[k].postedBy._id,
                                            "name": board.posts[board.posts.length-1-i].comments[j].comments[k].postedBy.firstName + " " + board.posts[board.posts.length-1-i].comments[j].comments[k].postedBy.lastName
                                          },
                                          "createdAt": moment(board.posts[board.posts.length-1-i].comments[j].comments[k].createdAt).format('LLL'),
                                          "text": board.posts[board.posts.length-1-i].comments[j].comments[k].text
                                        }
                                      })
            } else {
              commentsOfComments.push({ "own": false,
                                        "comment": {
                                          "_id": board.posts[board.posts.length-1-i].comments[j].comments[k]._id,
                                          "postedBy": {
                                            "_id": board.posts[board.posts.length-1-i].comments[j].comments[k].postedBy._id,
                                            "name": board.posts[board.posts.length-1-i].comments[j].comments[k].postedBy.firstName + " " + board.posts[board.posts.length-1-i].comments[j].comments[k].postedBy.lastName
                                          },
                                          "createdAt": moment(board.posts[board.posts.length-1-i].comments[j].comments[k].createdAt).format('LLL'),
                                          "text": board.posts[board.posts.length-1-i].comments[j].comments[k].text
                                        }
                                      })
            }
          }
          console.log("CommentsOfComments", commentsOfComments)
          if (req.user._id.toString() === board.posts[board.posts.length-1-i].comments[j].postedBy._id.toString()) {
            comments.push({ "own": true,
                            "comment": {
                              "_id": board.posts[board.posts.length-1-i].comments[j]._id,
                              "postedBy": {
                                "_id": board.posts[board.posts.length-1-i].comments[j].postedBy._id,
                                "name": board.posts[board.posts.length-1-i].comments[j].postedBy.firstName + " " + board.posts[board.posts.length-1-i].comments[j].postedBy.lastName
                              },
                              "createdAt": moment(board.posts[board.posts.length-1-i].comments[j].createdAt).format('LLL'),
                              "text": board.posts[board.posts.length-1-i].comments[j].text,
                              "comments": commentsOfComments
                            }
                          })
          } else {
            comments.push({ "own": false,
                            "comment": {
                              "_id": board.posts[board.posts.length-1-i].comments[j]._id,
                              "postedBy": {
                                "_id": board.posts[board.posts.length-1-i].comments[j].postedBy._id,
                                "name": board.posts[board.posts.length-1-i].comments[j].postedBy.firstName + " " + board.posts[board.posts.length-1-i].comments[j].postedBy.lastName
                              },
                              "createdAt": moment(board.posts[board.posts.length-1-i].comments[j].createdAt).format('LLL'),
                              "text": board.posts[board.posts.length-1-i].comments[j].text,
                              "comments": commentsOfComments
                            }
                          })
          }
        }
        if (req.user._id.toString() === board.posts[board.posts.length-1-i].postedBy._id.toString()) {
          if (board.posts[board.posts.length-1-i].postingGroup) {
            posts.push({"own": true,
                        "post": {
                          "_id": board.posts[board.posts.length-1-i]._id,
                          "title": board.posts[board.posts.length-1-i].title,
                          "postingGroup":  {
                            "_id": board.posts[board.posts.length-1-i].postingGroup._id,
                            "name": board.posts[board.posts.length-1-i].postingGroup.name
                          },
                          "createdAt": moment(board.posts[board.posts.length-1-i].createdAt).format('LLL'),
                          "text": board.posts[board.posts.length-1-i].text,
                          "comments": comments
                        }
                      })
          } else {
            posts.push({"own": true,
                        "post": {
                          "_id": board.posts[board.posts.length-1-i]._id,
                          "title": board.posts[board.posts.length-1-i].title,
                          "postedBy":  {
                            //"_id": board.posts[board.posts.length-1-i].postingGroup._id,
                            //"name": board.posts[board.posts.length-1-i].postingGroup.name
                            "_id": board.posts[board.posts.length-1-i].postedBy._id,
                            "name": board.posts[board.posts.length-1-i].postedBy.firstName + ' ' + board.posts[board.posts.length-1-i].postedBy.lastName
                          },
                          "board": board,
                          "createdAt": moment(board.posts[board.posts.length-1-i].createdAt).format('LLL'),
                          "text": board.posts[board.posts.length-1-i].text,
                          "comments": comments
                        }
                      })
          }
        } else {
          if (board.posts[board.posts.length-1-i].postingGroup) {
            posts.push({"own": false,
                        "post": {
                          "_id": board.posts[board.posts.length-1-i]._id,
                          "title": board.posts[board.posts.length-1-i].title,
                          "postingGroup":  {
                            "_id": board.posts[board.posts.length-1-i].postingGroup._id,
                            "name": board.posts[board.posts.length-1-i].postingGroup.name
                          },
                          "createdAt": moment(board.posts[board.posts.length-1-i].createdAt).format('LLL'),
                          "text": board.posts[board.posts.length-1-i].text,
                          "comments": comments
                        }
                      })
          } else {
            posts.push({"own": false,
                        "post": {
                          "_id": board.posts[board.posts.length-1-i]._id,
                          "title": board.posts[board.posts.length-1-i].title,
                          "postedBy":  {
                            "_id": board.posts[board.posts.length-1-i].postingGroup._id,
                            "name": board.posts[board.posts.length-1-i].postingGroup.name
                          },
                          "createdAt": moment(board.posts[board.posts.length-1-i].createdAt).format('LLL'),
                          "text": board.posts[board.posts.length-1-i].text,
                          "comments": comments
                        }
                      })
          }
        }
      }
      console.log("POSTS", posts);
      console.log("EVENTS", events);
      if (board.name === 'Event') {
        res.render('event-detail', {adminGroups: user.adminGroups, boardId: req.params.id, boardName: board.name, boardDescription: board.description, events: events})
      } else {
        res.render('board-overview', {adminGroups: user.adminGroups, boardId: req.params.id, boardName: board.name, boardDescription: board.description, events: events, posts: posts, 	helpers: {
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
        	}})
      }
    })
  })
});

//Making a post on a board page
router.post('/boards/:id/post', function(req, res) {
  if (req.user) {
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
        var newPost = new Post({
          postedBy: req.user._id,
          board: req.params.id,
          title: req.body.title,
          text: req.body.text,
          images: imageStringArray
        });
        newPost.save(function(error, newPost) {
          if (error)
            throw error;
          User.findById(req.user._id, function(error, user) {
            if (error)
              throw error;
            user.posts.push(newPost._id)
            user.save(function(error, updatedUser) {
              if (error)
                throw error
              Board.findById(newPost.board, function(error, board) {
                if (error)
                  throw error;
                board.posts.push(newPost._id)
                board.save(function(error, updatedBoard) {
                  if (error)
                    throw error;
                  //res.redirect('/boards/' + updatedBoard._id)
                  res.redirect('/home');
                })
              })
            })
          })
        })
      });
    } else {
      var newPost = new Post({
        postedBy: req.user._id,
        board: req.params.id,
        title: req.body.title,
        text: req.body.text
      });
      newPost.save(function(error, newPost) {
        if (error)
          throw error;
        User.findById(req.user._id, function(error, user) {
          if (error)
            throw error;
          user.posts.push(newPost._id)
          user.save(function(error, updatedUser) {
            if (error)
              throw error
            Board.findById(newPost.board, function(error, board) {
              if (error)
                throw error;
              board.posts.push(newPost._id)
              board.save(function(error, updatedBoard) {
                if (error)
                  throw error;
                res.redirect('/boards/' + updatedBoard._id)
              })
            })
          })
        })
      })
    }
  } else {
    var newPost = new Post({
      postedBy: req.user._id,
      postingGroup: req.body.postedBy,
      board: req.params.id,
      title: req.body.title,
      text: req.body.text
    })

    newPost.save(function(error, newPost) {
      if (error)
        throw error;
      User.findById(req.user._id, function(error, user) {
        if (error)
          throw error;
        user.posts.push(newPost._id)
        user.save(function(error, updatedUser) {
          if (error)
            throw error;
          Group.findById(req.body.postedBy, function(error, group) {
            if (error)
              throw error;
            group.posts.push(newPost._id)
            group.save(function(error, updatedGroup) {
              if (error)
                throw error
              Board.findById(newPost.board, function(error, board) {
                if (error)
                  throw error;
                board.posts.push(newPost._id)
                board.save(function(error, updatedBoard) {
                  if (error)
                    throw error;
                  res.redirect('/boards/' + updatedBoard._id);
                })
              })
            })
          })
        })
      })
    })
  }
})


//Making an event on the event page
router.post('/boards/:id/event', function(req, res) {
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
        board: req.params.id,
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
                  //res.redirect('/boards/'+updatedBoard._id)
                  res.redirect('/home');
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
      board: req.params.id,
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
                //res.redirect('/boards/'+updatedBoard._id)
                res.redirect('/home');
              })
            })
          })
        })
      })
    })
  }
})


//Making a challenge on the challenge page
router.post('/boards/:id/challenge', function(req, res) {
  var newChallenge = new Challenge({
    postedBy: req.user._id,
    name: req.body.name,
    board: req.params.id,
    deadline: req.body.deadline,
    text: req.body.text
  })
  newChallenge.save(function(error, newChallenge) {
    if (error)
      throw error;
    User.findById(req.user._id, function(error, user) {
      if (error)
        throw error;
      user.suggestedChallenges.push(newChallenge._id)
      user.save(function(error, updatedUser) {
        if (error)
          throw error;
        Board.findById(newChallenge.board, function(error, board) {
          if (error)
            throw error
          board.challenges.push(newChallenge._id)
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

//Subscribe to board
router.post('/boards/:id/subscribe', function(req, res) {
  Board.findById(req.params.id, function(error, board) {
    if (error)
      throw error
    board.subscribers.push(req.user._id)
    board.save(function(error, updatedBoard) {
      if (error)
        throw error;
      User.findById(req.user._id, function(error, user) {
        if (error)
          throw error;
        user.subscribedBoards.push(updatedBoard._id)
        user.save(function(error, updatedUser) {
          if (error)
            throw error;
          res.redirect('/')
        })
      })
    })
  })
})

//Unsubscribe to board
router.post('/boards/:id/unsubscribe', function(req, res) {
  Board.findById(req.params.id, function(error, board) {
    var boardSubscribers = board.subscribers
    var index1 = boardSubscribers.indexOf(req.user._id)
    board.subscribers = boardSubscribers.slice(0, index1).concat(boardSubscribers.slice(index1+1, boardSubscribers.length))
    board.save(function(error, updatedBoard) {
      if (error)
        throw error;
      User.findById(req.user._id, function(error, user) {
        if (error)
          throw error;
        var subscribedBoards = user.subscribedBoards
        var index2 = subscribedBoards.indexOf(updatedBoard._id)
        user.subscribedBoards = subscribedBoards.slice(0, index2).concat(subscribedBoards.slice(index2+1, subscribedBoards.length))
        user.save(function(error, updatedUser) {
          if (error)
            throw error
          res.redirect('/')
        })
      })
    })
  })
})

//Create board
router.post('/boards/create', function(req, res) {
  var newBoard = new Board({
    name: req.body.name,
    description: req.body.description
  });
  newBoard.save(function(err, newBoard) {
    if(err) throw err;
  })
  res.redirect('/home');
})

module.exports = router;
