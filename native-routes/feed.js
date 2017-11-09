var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var Board = require('../models/board');
var User = require('../models/user');

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

module.exports = function(passport) {
  router.get('/feed', passport.authenticate('jwt', { session: false }), function(req, res) {
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
            })
            Promise.all(feed).then(function(feed) { 
              res.json({feed: feed}) 
            });
          }
        })  
      }    
    })
  });
    
  return router;
}

