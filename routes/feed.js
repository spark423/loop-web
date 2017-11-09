var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group')
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Notification = require('../models/notification')
var Comment = require('../models/comment');

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

        console.log('item', items[j].item.createdAt)
        console.log('pivot', pivot.item.createdAt)
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

  router.get('/feed', function(req, res) {
    User.findById(req.user._id, function(err, user) {
      if (err) {
        throw err;
      } else {
        Board.find({$or: [{unsubscribable: true},{_id: {$in: user.subscribedBoards}}]}).populate([{path: 'contents.item', populate: [{path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]}]).exec(function(err, boards) {
          if (err) {
            throw err;
          } else {
            console.log("boards", boards)
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
                    "createdAt": comment.createdAt,
                    "postedBy": {
                      "id": comment.postedBy._id,
                      "firstName": comment.postedBy.firstName,
                      "lastName": comment.postedBy.lastName
                    },
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
            })
            Promise.all(feed).then(function(feed) {
              res.json({feed: feed})
            });
          }
        })
      }
    })
  });
/*
router.get('/feed', function(req, res) {
  Board.find({}, function(err, boards) {
    var posts=[];
    var events=[];
    console.log(boards[3].posts[16].comments);
    for(var i=0; i<boards.length; i++) {
      console.log(boards[i]);
      if(boards[i].posts) {
        console.log("going through posts");
      for(var j=0; j<boards[i].posts.length; j++) {
        var comments=[];
        console.log(boards[i].posts[j])
        console.log("COMMENTS", boards[i].posts[j].comments)
        if(boards[i].posts[j].comments) {
          console.log("going through comments");
        for(var k=0; k<boards[i].posts[j].comments.length; k++) {
          console.log(boards[i].posts[j].comments[k]);
          var commentsOfComments = [];
          if(boards[i].posts[j].comments[k].comments) {
            console.log("going through comments of comments");
          for(var l=0; l<boards[i].posts[j].comments[k].comments.length; l++) {
            commentsOfComments.push({"comment": {
            "_id": boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l]._id,
              "postedBy": {
                "_id": boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l].postedBy._id,
                "name": boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l].postedBy.firstName + " " + boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l].postedBy.lastName
              },
              "createdAt": moment(boards.posts[boards[i].posts.length-1-j].comments[k].comments[l].createdAt).format('LLL'),
              "text": boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l].text
            }})
            console.log(commentsOfComments);
          }
        }
          comments.push({"comment": {
            "_id": boards[i].posts[boards[i].posts.length-1-j].comments[k]._id,
            "postedBy": {
              "_id": boards[i].posts[boards[i].posts.length-1-j].comments[k].postedBy._id,
              "name": boards[i].posts[boards[i].posts.length-1-j].comments[k].postedBy.firstName + " " + boards[i].posts[boards[i].posts.length-1-j].comments[k].postedBy.lastName
            },
            "createdAt": moment(boards[i].posts[boards[i].posts.length-1-j].comments[k].createdAt).format('LLL'),
            "text": boards[i].posts[boards[i].posts.length-1-j].comments[k].text,
            "comments": commentsOfComments
          }})
          console.log(comments);
        }
        posts.push({"post": {
          "_id": board.posts[board.posts.length-1-i]._id,
          "title": board.posts[board.posts.length-1-i].title,
          "postedBy":  {
            "_id": board.posts[board.posts.length-1-i].postedBy._id,
            "name": board.posts[board.posts.length-1-i].postedBy.firstName + ' ' + board.posts[board.posts.length-1-i].postedBy.lastName
          },
          "board": board,
          "createdAt": moment(board.posts[board.posts.length-1-i].createdAt).format('LLL'),
          "text": board.posts[board.posts.length-1-i].text,
          "comments": comments
        }})
        console.log(posts);
      }
      }
    }
    }
    res.render('feed', {posts: posts, 	helpers: {
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
  })
})
*/



module.exports = router;
