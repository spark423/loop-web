var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group')
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Notification = require('../models/notification')
var Time = require('../models/time')
var moment = require('moment')
var Jimp = require('jimp')
var fs = require('fs')
var multer = require('multer')
var upload = multer();

router.get('/boardinfo', function(req, res) {
  Board.find({}, function(err, boards) {
    if(err) throw err;
    var info = [];
    for(var i=0; i<boards.length; i++) {
      info.push({"name": boards[i].name, "_id": boards[i]._id, "unsubscribable": boards[i].unsubscribable});
    }
    res.send({"info": info, "subscribedBoards": req.user.subscribedBoards});
  });
});

router.get('/boards/:id/edit', function(req, res) {
  Board.findById(req.params.id, function(err, board) {
    if(err) throw err;
    res.render('edit-board', {id: req.params.id, name: board.name, description: board.description});
  })
})

router.post('/boards/:id/edit', function(req, res) {
  Board.findById(req.params.id, function(err, board) {
    if(err) throw err;
    board.name=req.body.name;
    board.description=req.body.description;
    board.create=(req.body.create=='true');
    board.private = (req.body.private=='true');
    board.unsubscribable = (req.body.unsubscribable=='true');
    board.save(function(err, updatedBoard) {
      if(err) throw err;
      res.redirect('/boards/' + updatedBoard._id);
    })
  })
})

router.get('/boards', function(req, res) {
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
});
//Retrieving a board page
router.get('/boards/:id', function(req, res) {
  if(req.user) {
    Board.findById(req.params.id).populate([{path: 'contents.item', populate: [{path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]}]).exec(function(err, board) {
      if (err) {
        throw err;
      } else if (board.private) {
        let contents = board.contents.reverse().map(async function(content) {
          if (content.postedBy === req.user._id.toString()) {
            console.log("got here1");
            let item = content.item;
            let kind = content.kind;
            let comments = [];
            for (let j=0; j<item.comments.length; j++) {
              let comment = item.comments[j];
              let commentOfComments = comment.comments.map(function(commentOfComment) {
                return {"id": commentOfComment._id, "createdAt": commentOfComment.createdAt, "postedBy": {"id": commentOfComment.postedBy._id, "firstName": commentOfComment.postedBy.firstName, "lastName": commentOfComment.postedBy.lastName}, "text": commentOfComment.text}
              })
              console.log("got here2");

              comments.push({
                "id": comment._id,
                "createdAt": moment(comment.createdAt).format('MMMM D, YYYY, h:mm a'),
                "postedBy": {
                  "id": comment.postedBy._id,
                  "firstName": comment.postedBy.firstName,
                  "lastName": comment.postedBy.lastName
                },
                "text": comment.text,
                "comments": commentOfComments
              });
            }
            console.log("got here3");

            if (kind == 'Post') {
              let postCreator = await User.findById(item.postedBy);
              let postObject = {
                "own": req.user._id.toString() === postCreator._id.toString(),
                "following": req.user.followingPosts.indexOf(item._id) > -1,
                "id": item._id,
                "board": item.board,
                "createdAt": moment(item.createdAt).format('MMMM D, YYYY, h:mm a'),
                "postedBy": {
                  "id": postCreator._id,
                  "firstName": postCreator.firstName,
                  "lastName": postCreator.lastName
                },
                "title": item.title,
                "text": item.text,
                "comments": comments
              }
              console.log("got here4");

              return Promise.resolve(postObject)
            } else {
              console.log("got here5");

              let attendees = item.attendees.map(function(attendee) {
                return {"id": attendee._id, "firstName": attendee.firstName, "lastName": attendee.lastName}
              })
              console.log("got here6");

              let eventCreator = await User.findOne({username: item.contact});
              if (eventCreator) {
                let eventObject = {
                  "own": req.user.username === item.postedBy,
                  "attending": req.user.attendedEvents.indexOf(item._id) > -1,
                  "id": item._id,
                  "createdAt": moment(item.createdAt).format('MMMM D, YYYY, h:mm a'),
                  "postedBy": {
                    "id": eventCreator._id,
                    "firstName": eventCreator.firstName,
                    "lastName": eventCreator.lastName
                  },
                  "title": item.title,
                  "date": moment(item.date).utc().format('MMMM D, YYYY'),
                  "startTime": moment(item.startTime, "HH:mm").format('h:mm a'),
                  "endTime": moment(item.endTime, "HH:mm").format('h:mm a'),
                  "location": item.location,
                  "description": item.description,
                  "comments": comments,
                  "attendees": attendees
                }
                console.log("got here7");

                return Promise.resolve(eventObject);
              } else {
                let eventObject = {
                  "own": req.user.username === item.postedBy,
                  "attending": req.user.attendedEvents.indexOf(item._id) > -1,
                  "id": item._id,
                  "createdAt": moment(item.createdAt).format('MMMM D, YYYY, h:mm a'),
                  "postedBy": item.contact,
                  "title": item.title,
                  "date": moment(item.date).utc().format('MMMM D, YYYY'),
                  "startTime": moment(item.startTime, "HH:mm").format('h:mm a'),
                  "endTime": moment(item.endTime, "HH:mm").format('h:mm a'),
                  "location": item.location,
                  "description": item.description,
                  "comments": comments,
                  "attendees": attendees
                };
                console.log("got here8");

                return Promise.resolve(eventObject);
              }
            }
          }
        });
        Promise.all(contents).then(function(contents) {
          console.log("here");
          res.render('board-overview', {
            board: {
              id: board._id,
              create: board.create,
              unsubscribable: board.unsubscribable,
              subscribed: req.user.subscribedBoards.indexOf(board._id) > -1,
              name: board.name,
              description: board.description,
              contents: contents}, helpers: {
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
      } else {
        console.log(board);
        console.log(board.contents);
        let contents = board.contents.reverse().map(async function(content) {
          let item = content.item;
          let kind = content.kind;
          let comments = [];
          for (let j=0; j<item.comments.length; j++) {
            let comment = item.comments[j];
            let commentOfComments = comment.comments.map(function(commentOfComment) {
              return {"id": commentOfComment._id, "createdAt": commentOfComment.createdAt, "postedBy": {"id": commentOfComment.postedBy._id, "firstName": commentOfComment.postedBy.firstName, "lastName": commentOfComment.postedBy.lastName}, "text": commentOfComment.text}
            })
            console.log("a1");
            comments.push({
              "id": comment._id,
              "createdAt": moment(comment.createdAt).format('MMMM D, YYYY, h:mm a'),
              "postedBy": {
                "id": comment.postedBy._id,
                "firstName": comment.postedBy.firstName,
                "lastName": comment.postedBy.lastName
              },
              "text": comment.text,
              "comments": commentOfComments
            });
            console.log("a2");
          }
          if (kind == 'Post') {
            console.log(item);
            console.log(item.postedBy);
            let postCreator = await User.findById(item.postedBy);
            console.log(postCreator);
            let postObject = {
              "own": req.user._id.toString() === postCreator._id.toString(),
              "following": req.user.followingPosts.indexOf(item._id) > -1,
              "id": item._id,
              "board": item.board,
              "createdAt": moment(item.createdAt).format('MMMM D, YYYY, h:mm a'),
              "postedBy": {
                "id": postCreator._id,
                "firstName": postCreator.firstName,
                "lastName": postCreator.lastName
              },
              "title": item.title,
              "text": item.text,
              "comments": comments
            }
            console.log(postObject);
            return Promise.resolve(postObject)
          } else {
            let attendees = item.attendees.map(function(attendee) {
              return {"id": attendee._id, "firstName": attendee.firstName, "lastName": attendee.lastName}
            })
            console.log("a4");
            let eventCreator = await User.findOne({username: item.contact});
            if (eventCreator) {
              let eventObject = {
                "own": req.user.username === item.contact,
                "attending": req.user.attendedEvents.indexOf(item._id) > -1,
                "id": item._id,
                "createdAt": moment(item.createdAt).format('MMMM D, YYYY, h:mm a'),
                "postedBy": {
                  "id": eventCreator._id,
                  "firstName": eventCreator.firstName,
                  "lastName": eventCreator.lastName
                },
                "title": item.title,
                "date": moment(item.date).utc().format('MMMM D, YYYY'),
                "startTime": moment(item.startTime, "HH:mm").format('h:mm a'),
                "endTime": moment(item.endTime, "HH:mm").format('h:mm a'),
                "location": item.location,
                "description": item.description,
                "comments": comments,
                "attendees": attendees
              }
              console.log(eventObject);

              return Promise.resolve(eventObject);
            } else {
              let eventObject = {
                "own": req.user.username === item.contact,
                "attending": req.user.attendedEvents.indexOf(item._id) > -1,
                "id": item._id,
                "createdAt": moment(item.createdAt).format('MMMM D, YYYY, h:mm a'),
                "postedBy": item.contact,
                "title": item.title,
                "date": moment(item.date).utc().format('MMMM D, YYYY'),
                "startTime": moment(item.startTime, "HH:mm").format('h:mm a'),
                "endTime": moment(item.endTime, "HH:mm").format('h:mm a'),
                "location": item.location,
                "description": item.description,
                "comments": comments,
                "attendees": attendees
              };
              console.log(eventObject);
              return Promise.resolve(eventObject);
            }
          }
        });
        console.log("b1");
        Promise.all(contents).then(function(contents) {
          console.log("here2");
          res.render('board-overview', {
            board: {
              id: board._id,
              create: board.create,
              unsubscribable: board.unsubscribable,
              subscribed: req.user.subscribedBoards.indexOf(board._id) > -1,
              name: board.name,
              description: board.description,
              contents: contents}, helpers: {
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
        }, function(error) {console.log(error)})
      }
    })
  }
  else {
    res.redirect('/');
  }
});

//Making a post on a board page
router.post('/boards/:id/post', function(req, res) {
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
        res.redirect('/boards/' + req.params.id);
      })
    });
  });
})

//Unsubscribe to board
router.post('/boards/:id/unsubscribe', function(req, res) {
  Time.findOneAndUpdate({}, {$pull: {subscriptions: {createdAt: Date.now(), board: req.params.id, user:req.user._id}}}, function(err, time) {
    if (err) {
      throw err;
    } else {
      User.findById(req.user._id, function(error, user) {
        if (error)
          throw error;
        user.subscribedBoards.splice(user.subscribedBoards.indexOf(req.params.id), 1);
        user.save(function(error, updatedUser) {
          if (error)
            throw error;
          res.status(200);
        })
      })
    }
  })
})

router.get('/create-a-new-board', function(req, res) {
  res.render("create-a-new-board");
});

//Create board
router.post('/boards/create', function(req, res) {
  var newBoard = new Board({
    name: req.body.name,
    description: req.body.description,
    create: (req.body.create=='true'),
    private: (req.body.private=='true'),
    unsubscribable: (req.body.unsubscribable=='true')
  });
  newBoard.save(function(err, newBoard) {
    if(err) throw err;
    User.findById(req.user._id, function(err, user) {
      if (err) throw err;
      user.subscribedBoards.push(newBoard._id);
      user.save(function(err, updatedUser) {
        Time.findOneAndUpdate({}, {$push: {subscriptions: {createdAt: Date.now(), board: newBoard._id, user: req.user._id}}}, function(err, time) {
          if(err) throw err;
          res.redirect('/boards/' + newBoard._id);
        })
      })
    })
  })
})

module.exports = router;
