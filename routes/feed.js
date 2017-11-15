var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group')
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Notification = require('../models/notification')
var Comment = require('../models/comment');
var moment = require('moment')

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
        while (items[i].item.createdAt < pivot.item.createdAt) {
            i++;
        }
        while (items[j].item.createdAt > pivot.item.createdAt) {
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

//Render feed page
  router.get('/feed', function(req, res) {
    if(req.user) {
      User.findById(req.user._id, function(err, user) {
        if (err) {
          throw err;
        } else {
          Board.find({$or: [{unsubscribable: true},{_id: {$in: user.subscribedBoards}}]}).populate([{path: 'contents.item', populate: [{path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]}]).exec(function(err, boards) {
            if (err) {
              throw err;
            } else {
              let contents = [];
              for (let i=0; i<boards.length; i++) {
                contents = contents.concat(boards[i].contents)
              }
              let sortedContents = quickSort(contents, 0, contents.length - 1);
              let feed = sortedContents.reverse().map(async function(content) {
                let item = content.item;
                let kind = content.kind;
                let comments = [];
                  for (let j=0; j<item.comments.length; j++) {
                    let comment = item.comments[j];
                        commentOfComments = comment.comments.map(function(commentOfComment) {
                          return {"id": commentOfComment._id, "createdAt": commentOfComment.createdAt, "postedBy": {"id": commentOfComment.postedBy._id, "firstName": commentOfComment.postedBy.firstName, "lastName": commentOfComment.postedBy.lastName}}
                        })
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
                if (kind == 'Post') {
                  let postCreator = await User.findById(item.postedBy);
                  let boardName = await Board.findById(item.board);
                  let postObject = {
                    "own": req.user._id.toString() === postCreator._id.toString(),
                    "following": req.user.followingPosts.indexOf(item._id) > -1,
                    "id": item._id,
                    "board": item.board,
                    "boardName": boardName.name,
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
                      "createdAt": moment(item.createdAt).format('MMMM D, YYYY, h:mm a'),
                      "postedBy": {
                        "id": eventCreator._id,
                        "firstName": eventCreator.firstName,
                        "lastName": eventCreator.lastName
                      },
                      "title": item.title,
                      "date": moment(item.date).format('MMMM D, YYYY'),
                      "startTime": moment(item.startTime, "HH:mm").format('h:mm a'),
                      "endTime": moment(item.endTime, "HH:mm").format('h:mm a'),
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
                      "createdAt": moment(item.createdAt).format('MMMM D, YYYY, h:mm a'),
                      "postedBy": item.contact,
                      "title": item.title,
                      "date": moment(item.date).format('MMMM D, YYYY'),
                      "startTime": moment(item.startTime, "HH:mm").format('h:mm a'),
                      "endTime": moment(item.endTime, "HH:mm").format('h:mm a'),
                      "location": item.location,
                      "description": item.description,
                      "comments": comments,
                      "attendees": attendees
                    };
                    return Promise.resolve(eventObject);
                  }
                }
              })
              Promise.all(feed).then(function(feed) {
                res.render('feed', {contents: feed, helpers: {
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
              });
            }
          })
        }
      })
    } else {
      res.redirect('/');
    }
  });

module.exports = router;
