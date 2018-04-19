var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group')
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Comment = require('../models/comment');
var Notification = require('../models/notification')
var Time = require('../models/time')
var Tag = require('../models/tag')
var Office = require('../models/office')
var moment = require('moment-timezone')
var contentSort = require('./contentsort');
var Jimp = require('jimp')
var fs = require('fs')
var multer = require('multer')
var upload = multer();

//Get boards for sidenav
router.get('/boardinfo', function(req, res) {
  if(req.user) {
    Board.find({}, function(err, boards) {
      if(err) throw err;
      var info = [];
      for(var i=0; i<boards.length; i++) {
        if(boards[i].archive==false && req.user.viewBlockedBoards.indexOf(boards[i]._id)==-1) {
          if(boards[i].private==true && req.user.admin) {
            info.push({"name": boards[i].name, "_id": boards[i]._id, "unsubscribable": boards[i].unsubscribable, "active": boards[i].active});
          } else if(boards[i].private==true && !req.user.admin) {
            continue;
          } else {
            info.push({"name": boards[i].name, "_id": boards[i]._id, "unsubscribable": boards[i].unsubscribable, "active": boards[i].active});
          }
        }
      }
      res.send({"info": info, "subscribedBoards": req.user.subscribedBoards, admin: req.user.admin});
    });
  } else {
    res.redirect('/');
  }
});

//Render page for editing board
router.get('/boards/:id/edit', function(req, res) {
  if(req.user.admin) {
    Board.findById(req.params.id, function(err, board) {
      if(err) throw err;
      res.render('edit-board', {id: req.params.id, name: board.name, description: board.description, active: board.active, admin: req.user.admin});
    })
  } else {
    res.redirect('/');
  }
})

//Edit a board
router.post('/boards/:id/edit', function(req, res) {
  if(req.user.admin) {
    Board.findById(req.params.id, function(err, board) {
      if(err) throw err;
      board.name=req.body.name;
      board.description=req.body.description;
      board.create=(req.body.create=='true');
      board.private = (req.body.private=='true');
      board.unsubscribable = (req.body.unsubscribable=='false');
      board.save(function(err, updatedBoard) {
        if(err) throw err;
        res.redirect('/boards/' + updatedBoard._id);
      })
    })
  } else {
    res.send("Error, not logged in");
  }
})

router.post('/boards/:id/deactivate', function(req, res) {
  if(req.user.admin) {
    Board.findById(req.params.id, function(err, board) {
      if(err) throw err;
      board.active=false;
      board.save(function(err, updatedBoard) {
        if(err) throw err;
        let notificationToSubscribers = new Notification({
          type: 'Deactivated Board',
          message: "The Board, " + updatedBoard.name + ", that you are subscribed to has been deactivated.",
          routeID: {
            kind: 'Board',
            id: updatedBoard._id
          }
        })
        notificationToSubscribers.save(function(err, notificationToSubscribers) {
          if(err) throw err;
          User.findOneAndUpdate({$and: [{subscribedBoards: updatedBoard._id}, {_id: {$ne: req.user._id}}]}, {$push: {notifications: notificationToSubscribers._id}}, function(err) {
            if (err) throw (err);
          })
          res.redirect('/boards/' + updatedBoard._id);
        })
      })
    })
  } else {
    res.send("Error, not logged in");
  }
})

router.post('/boards/:id/reactivate', function(req, res) {
  if(req.user.admin) {
    Board.findById(req.params.id, function(err, board) {
      if(err) throw err;
      board.active=true;
      board.save(function(err, updatedBoard) {
        if(err) throw err;
        let notificationToSubscribers = new Notification({
          type: 'Reactivated Board',
          message: "The Board, " + updatedBoard.name + ", that you are subscribed to has been reactivated.",
          routeID: {
            kind: 'Board',
            id: updatedBoard._id
          }
        })
        notificationToSubscribers.save(function(err, notificationToSubscribers) {
          if(err) throw err;
          User.findOneAndUpdate({$and: [{subscribedBoards: updatedBoard._id}, {_id: {$ne: req.user._id}}]}, {$push: {notifications: notificationToSubscribers._id}}, function(err) {
            if (err) throw (err);
          })
          res.redirect('/boards/' + updatedBoard._id);
        })
      })
    })
  } else {
    res.send("Error, not logged in");
  }
})

router.post('/boards/:id/delete', function(req, res) {
  if(req.user.admin) {
    Board.findOneAndUpdate({_id: req.params.id}, {$set: {archive: true}}, function(err) {
      if(err) throw err;
    });
    Post.findOneAndUpdate({board: req.params.id}, {$set: {archive: true}}, function(err) {
      if(err) throw err;
    })
    Event.findOneAndUpdate({board: req.params.id}, {$set: {archive: true}}, function(err) {
      if(err) throw err;
    })
    let notificationToSubscribers = new Notification({
      type: 'Deleted Board',
      message: "The Board, " + updatedBoard.name + ", that you are subscribed to has been deleted.",
      routeID: {
        kind: 'Board',
        id: updatedBoard._id
      }
    })
    notificationToSubscribers.save(function(err, notificationToSubscribers) {
      if(err) throw err;
      User.findOneAndUpdate({$and: [{subscribedBoards: updatedBoard._id}, {_id: {$ne: req.user._id}}]}, {$push: {notifications: notificationToSubscribers._id}}, function(err) {
        if (err) throw (err);
      })
      res.redirect('/');
    })
    /*
    Board.findById(req.params.id, function(err, board) {
      if(err) throw err;
      board.archive = true;
      board.save(function(err, updatedBoard) {
        if(err) throw err;
        for(var i=0; i<updatedBoard.contents.length; i++) {
          if(updatedBoard.contents[i].kind=="Post") {
            Post.findById(board.contents[i].item, function(err, posts) {
              posts.archive=true;
              posts.save(function(err, updatedPost) {
                if(err) throw err;
                Comment.find({'_id': updatedPost.comments}, function(err, comments) {
                  for(var j=0; j<comments.length; j++) {
                    comments[j].archive=true;
                    comments[j].save(function(err, updatedComment) {
                      if(err) throw err;
                    })
                  }
                })
              })
            })
          }
          else {
            Event.findById(board.contents[i].item, function(err, events) {
              events.archive=true;
              events.save(function(err, updatedEvent) {
                if(err) throw err;
                Comment.find({'_id': events.comments}, function(err, comments) {
                  for(var j=0; j<comments.length; j++) {
                    comments[j].archive=true;
                    comments[j].save(function(err, updatedComment) {
                      if(err) throw err;
                    })
                  }
                })
              })
            })
          }
        }
        let notificationToSubscribers = new Notification({
          type: 'Deleted Board',
          message: "The Board, " + updatedBoard.name + ", that you are subscribed to has been deleted.",
          routeID: {
            kind: 'Board',
            id: updatedBoard._id
          }
        })
        notificationToSubscribers.save(function(err, notificationToSubscribers) {
          if(err) throw err;
          User.findOneAndUpdate({$and: [{subscribedBoards: updatedBoard._id}, {_id: {$ne: req.user._id}}]}, {$push: {notifications: notificationToSubscribers._id}}, function(err) {
            if (err) throw (err);
          })
          res.redirect('/');
        })
      })
    })*/
  } else {
    res.send("Error, not logged in");
  }
})

//Retrieving a board page
router.get('/boards/:id', function(req, res) {
  if(req.user && !req.user.verified) {
    res.redirect('/not-verified');
  }
  else if(req.user) {
    if(req.user.viewBlockedBoards.indexOf(req.params.id)!=-1) {
      res.redirect('/');
    } else {
      Board.findById(req.params.id).populate([{path: 'contents.item', populate: [{path: 'tags'}, {path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]}]).populate('notifications').exec(function(err, board) {
        if (err) {
          throw err;
        }
        if(board.private==true && !req.user.admin) {
          res.redirect('/');
        }
          let contents = board.contents.reverse().map(async function(content) {
            let item = content.item;
            let kind = content.kind;
            let comments = [];
            for (let j=0; j<item.comments.length; j++) {
              let comment = item.comments[j];
              let commentOfComments = comment.comments.map(function(commentOfComment) {
                return {"own": req.user._id.toString() === commentOfComment.postedBy._id.toString(), "id": commentOfComment._id, "createdAt": commentOfComment.createdAt, "postedBy": {"id": commentOfComment.postedBy._id, "firstName": commentOfComment.postedBy.firstName, "lastName": commentOfComment.postedBy.lastName}, "text": commentOfComment.text}
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
            if (kind == 'Post') {
              if(item.postingGroup) {
                let postCreator = await Group.findById(item.postingGroup);
                let postObject = {
                  "own": req.user._id.toString() === item.postedBy.toString(),
                  "following": req.user.followingPosts.indexOf(item._id) > -1,
                  "id": item._id,
                  "board": item.board,
                  "createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
                  "postingGroup": {
                    "id": postCreator._id,
                    "name": postCreator.name,
                  },
                  "title": item.title,
                  "text": item.text,
                  "flagged": item.flagged,
                  "comments": comments,
                  "tags": item.tags
                }
                return Promise.resolve(postObject)
              } else if (item.postingOffice) {
                let postCreator = await Office.findById(item.postingOffice);
                let postObject = {
                  "own": req.user._id.toString() === item.postedBy.toString(),
                  "following": req.user.followingPosts.indexOf(item._id) > -1,
                  "id": item._id,
                  "board": item.board,
                  "createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
                  "postingOffice": {
                    "id": postCreator._id,
                    "name": postCreator.name,
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
                let postObject = {
                  "own": req.user._id.toString() === postCreator._id.toString(),
                  "following": req.user.followingPosts.indexOf(item._id) > -1,
                  "id": item._id,
                  "board": item.board,
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
                  "own": req.user.username === item.contact,
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
                  "own": req.user.username === item.contact,
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
                    "own": req.user.username === item.contact,
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
                    "own": req.user.username === item.contact,
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
          });
          Promise.all(contents).then(function(contents) {
            let notifications = board.notifications.map(function(notification) {
              return {"id": notification._id, "createdAt": moment(notification.createdAt).tz("America/New_York").format('MMM D, YYYY, h:mm a'), "message": notification.message, "routeID": notification.routeID.id, "kind": notification.routeID.kind}
            });
            pages = [];
            numPages = 0;
            currentPage = 0;
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
                res.render('board-overview', {
                  board: {
                    id: board._id,
                    create: board.create,
                    unsubscribable: board.unsubscribable,
                    subscribed: req.user.subscribedBoards.indexOf(board._id) > -1,
                    name: board.name,
                    active: board.active,
                    description: board.description,
                    contents: contents,
                    create: board.create,
                    notifications: notifications}, pages: pages, currentPage: currentPage, admin: req.user.admin, blocked: req.user.blocked, postBlocked: req.user.postBlockedBoards.indexOf(req.params.id) >= 0, tags: tags, groups: adminGroups, office: user.office, helpers: {
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
                })            })
            })
          }, function(error) {console.log(error)})
      })
    }
  }
  else {
    res.redirect('/');
  }
});

//Making a post on a board page
router.post('/boards/:id/post', function(req, res) {
  var tagsList = req.body.tags.split(',');
  console.log(req.body);
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
    var promisePost = new Promise(function(resolve, reject) {
      if(req.body.postAs=="self") {
        let newPost = new Post({
          postedBy: req.user._id,
          board: req.params.id,
          title: req.body.title,
          text: req.body.text,
          tags: tags
        })
        console.log("self");
        resolve(newPost);
      } else {
        Office.findById(req.body.postAs, function(err, office) {
          if(office) {
            let newPost = new Post({
              postedBy: req.user._id,
              board: req.params.id,
              title: req.body.title,
              text: req.body.text,
              tags: tags,
              postingOffice: req.body.postAs,
              onOfficePage: true
            })
            console.log("office");
            resolve(newPost);
          } else {
            let newPost = new Post({
              postedBy: req.user._id,
              board: req.params.id,
              title: req.body.title,
              text: req.body.text,
              tags: tags,
              postingGroup: req.body.postAs,
              onGroupPage: true
            })
            console.log("group");
            resolve(newPost);
          }
        })
      }
    })
    promisePost.then(function(newPost) {
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
  })
})

//subscribe to a board
router.post('/boards/:id/subscribe', function(req, res) {
  Time.findOneAndUpdate({}, {$push: {subscriptions: {createdAt: Date.now(), board: req.params.id, user:req.user._id}}}, function(err, time) {
    if (err) {
      throw err;
    } else {
      User.findById(req.user._id, function(error, user) {
        if (error)
          throw error;
        user.subscribedBoards.push(req.params.id);
        user.validateSync();
        user.save(function(error, updatedUser) {
          if (error)
            throw error;
          res.send();
        })
      })
    }
  })
})

//Unsubscribe to board
router.post('/boards/:id/unsubscribe', function(req, res) {
  Time.findOneAndUpdate({}, {$pull: {subscriptions: {board: req.params.id, user:req.user._id}}}, function(err, time) {
    if (err) {
      throw err;
    } else {
      User.findById(req.user._id, function(error, user) {
        if (error)
          throw error;
        user.subscribedBoards.splice(user.subscribedBoards.indexOf(req.params.id), 1);
        user.validateSync();
        user.save(function(error, updatedUser) {
          if (error)
            throw error;
          res.send();
        })
      })
    }
  })
})

//Render create a new board page
router.get('/create-a-new-board', function(req, res) {
  if(req.user) {
    if(req.user.admin) {
      res.render("create-a-new-board", {admin: req.user.admin});
    }
  } else {
    res.redirect('/');
  }
});

//Create board
router.post('/boards/create', function(req, res) {
  var newBoard = new Board({
    name: req.body.name,
    description: req.body.description,
    create: (req.body.create=='true'),
    private: (req.body.private=='true'),
    unsubscribable: (req.body.unsubscribable=='false')
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
