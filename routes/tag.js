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
var Office = require('../models/office');
var Tag = require('../models/tag')


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
        while (items[i].createdAt < pivot.createdAt) {
            i++;
        }
        while (items[j].createdAt > pivot.createdAt) {
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

router.get('/tag/:id', function(req, res) {
  if(req.user) {
          Post.find({tags: req.params.id}).populate([{path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]).populate('tags').exec(function(err, posts) {
            if(err) throw err;
            Event.find({tags: req.params.id}).populate([{path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]).populate('tags').exec(function(err, events) {
              if(err) throw err;
              let contents = [];
              contents = contents.concat(events);
              contents = contents.concat(posts);
              console.log(contents);
              let sortedContents = quickSort(contents, 0, contents.length-1);
              sortedContents.reverse();
              var numPages = Math.ceil(sortedContents.length/10);
              var pages = [];
              if(numPages<20) {
                for(var i=1; i<=numPages; i++) {
                  pages.push(i);
                }
              } else {
                if(req.query.page) {
                  if(req.query.page>10 && req.query.page <= numPages-9) {
                    for(var i=req.query.page-9;i<req.query.page+10;i++) {
                      pages.push(i);
                    }
                  }
                } else {
                  for(var i=1; i<=numPages; i++) {
                    pages.push(i);
                  }
                }
              }
              if(req.query.page) {
                var currentPage = req.query.page;
                sortedContents = sortedContents.slice(req.query.page*10 - 10, req.query.page*10);
              } else {
                var currentPage = 1;
                sortedContents = sortedContents.slice(0, 10);
              }
              let feed = sortedContents.map(async function(item) {
                let comments = [];
                  for (let j=0; j<item.comments.length; j++) {
                    let comment = item.comments[j];
                        commentOfComments = comment.comments.map(function(commentOfComment) {
                          return {"own": req.user._id.toString() === commentOfComment.postedBy._id.toString(), "id": commentOfComment._id, "createdAt": commentOfComment.createdAt, "postedBy": {"id": commentOfComment.postedBy._id, "firstName": commentOfComment.postedBy.firstName, "lastName": commentOfComment.postedBy.lastName}, "flagged": commentOfComment.flagged}
                        })
                    comments.push({
                      "own": req.user._id.toString() === comment.postedBy._id.toString(),
                      "id": comment._id,
                      "createdAt": moment(comment.createdAt).local().format('MMMM D, YYYY, h:mm a'),
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
                if (!item.date) {
                  if(item.postingGroup) {
                    let postCreator = await Group.findById(item.postingGroup);
                    let boardName = await Board.findById(item.board);
                    let postObject = {
                      "own": req.user._id.toString() === item.postedBy.toString(),
                      "following": req.user.followingPosts.indexOf(item._id) > -1,
                      "id": item._id,
                      "board": item.board,
                      "boardName": boardName.name,
                      "createdAt": moment(item.createdAt).local().format('MMMM D, YYYY, h:mm a'),
                      "postingGroup": {
                        "id": postCreator._id,
                        "name": postCreator.name
                      },
                      "title": item.title,
                      "text": item.text,
                      "flagged": item.flagged,
                      "comments": comments,
                      "tags": item.tags
                    }
                    return Promise.resolve(postObject)
                  } else if(item.postingOffice) {
                    let postCreator = await Office.findById(item.postingOffice);
                    let boardName = await Board.findById(item.board);
                    let postObject = {
                      "own": req.user._id.toString() === item.postedBy.toString(),
                      "following": req.user.followingPosts.indexOf(item._id) > -1,
                      "id": item._id,
                      "board": item.board,
                      "boardName": boardName.name,
                      "createdAt": moment(item.createdAt).local().format('MMMM D, YYYY, h:mm a'),
                      "postingOffice": {
                        "id": postCreator._id,
                        "name": postCreator.name
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
                    let boardName = await Board.findById(item.board);
                    let postObject = {
                      "own": req.user._id.toString() === postCreator._id.toString(),
                      "following": req.user.followingPosts.indexOf(item._id) > -1,
                      "id": item._id,
                      "board": item.board,
                      "boardName": boardName.name,
                      "createdAt": moment(item.createdAt).local().format('MMMM D, YYYY, h:mm a'),
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
                      "own": req.user.username === item.postedBy,
                      "attending": req.user.attendedEvents.indexOf(item._id) > -1,
                      "id": item._id,
                      "createdAt": moment(item.createdAt).local().format('MMMM D, YYYY, h:mm a'),
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
                      "own": req.user.username === item.postedBy,
                      "attending": req.user.attendedEvents.indexOf(item._id) > -1,
                      "id": item._id,
                      "createdAt": moment(item.createdAt).local().format('MMMM D, YYYY, h:mm a'),
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
                        "own": req.user.username === item.postedBy,
                        "attending": req.user.attendedEvents.indexOf(item._id) > -1,
                        "id": item._id,
                        "createdAt": moment(item.createdAt).local().format('MMMM D, YYYY, h:mm a'),
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
                        "own": req.user.username === item.postedBy,
                        "attending": req.user.attendedEvents.indexOf(item._id) > -1,
                        "id": item._id,
                        "createdAt": moment(item.createdAt).local().format('MMMM D, YYYY, h:mm a'),
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
              })
              Promise.all(feed).then(function(feed) {
                console.log(feed);
                Tag.findById(req.params.id, function(err, tag) {
                  if (err)
                    throw err;
                    res.render('tag-feed', {
                      name: tag.name,
                      followers: tag.followers.length,
                      numberContent: tag.numberContent,
                      id: tag._id,
                      following: req.user.tags.indexOf(req.params.id) != -1,
                      contents: feed, pages: pages, currentPage: currentPage, user: req.user._id, helpers: {
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
          })
        })
      })
  } else {
    res.redirect('/');
  }
})

router.post('/tag/:id/follow', function(req, res) {
  if(req.user) {
    Tag.findById(req.params.id, function(err, tag) {
      if(err) throw err;
      tag.followers.push(req.user._id);
      tag.save(function(err, savedTag) {
        if(err) throw err;
        req.user.tags.push(savedTag._id);
        req.user.save(function(err, savedUser) {
          if(err) throw err;
          res.send();
        })
      })
    })
  } else {
    res.redirect('/');
  }
})

router.post('/tag/:id/unfollow', function(req, res) {
  if(req.user) {
    Tag.findById(req.params.id, function(err, tag) {
      if(err) throw err;
      tag.followers.splice(tag.followers.indexOf(req.user._id), 1);
      tag.save(function(err, savedTag) {
        if(err) throw err;
        req.user.tags.splice(req.user.tags.indexOf(savedTag._id), 1);
        req.user.save(function(err, savedUser) {
          if(err) throw err;
          res.send();
        })
      })
    })
  } else {
    res.redirect('/');
  }
})

module.exports = router;
