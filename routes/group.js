var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Notification = require('../models/notification');
var Tag = require('../models/tag')
var moment = require('moment-timezone');

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

//Create a new group
router.post('/groups/create', function(req, res) {
  if(req.body.admin) {
    admin=req.body.admin;
    var newGroup = new Group({
      name: req.body.name,
      description: req.body.description,
      admin: admin
    });
  }
  else {
    admin='';
    var newGroup = new Group({
      name: req.body.name,
      description: req.body.description
    });
  }
  var containsAdmin = false;
  var addMembers = req.body.addMembers.split(',');
  var removeMembers = req.body.removeMembers.split(',');
  for(var i=0; i<removeMembers.length; i++) {
    for(var j=0; j<addMembers.length; j++) {
      if(removeMembers[i]==addMembers[j]) {
        addMembers.splice(j, 1);
      }
    }
  }
  for(var i=0; i<addMembers.length; i++) {
    if(addMembers[i]==admin) {
      containsAdmin=true;
      break;
    }
  }
  if(containsAdmin==false) {
    addMembers.push(admin);
  }

  User.find({'username': addMembers}, function(err, members) {
    console.log(members);
    for(var i=0; i<members.length; i++) {
      newGroup.members.push(members[i]._id);
    }
    if(!req.user.admin && members.indexOf(req.user._id)!=-1) {
      newGroup.members.push(req.user._id);
    }
    var tagsList = req.body.tags.split(',');
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
      newGroup.tags = tags;
      newGroup.save(function(err, newGroup) {
        if(err) throw err;
        for(var i=0; i<members.length; i++) {
          if(admin==members[i].username) {
            members[i].adminGroups.push(newGroup._id);
          }
          members[i].joinedGroups.push(newGroup._id);
          var newNotification = new Notification({
            type: 'Added to Organization',
            message: "You have been added to a new Organization, " + newGroup.name + ".",
            routeID: {
              kind: 'Group',
              id: newGroup._id
            }
          });
          members[i].save(function(err, updatedUser) {
            if(err) throw err;
            newNotification.save(function(err, notification) {
              if(err) throw err;
              updatedUser.notifications.push(notification._id);
              updatedUser.save(function(err, completeUser) {
                if(err) throw err;
              })
            })
          });
        }
        res.redirect('/groups/' + newGroup._id);
      })
    })
  })
})

//Page for creating group
router.get('/create-a-new-org', function(req, res) {
  if(req.user && !req.user.verified) {
    res.redirect('/not-verified');
  }
  else if(req.user) {
    if(req.user.blocked) {
      res.redirect('/');
    } else {
      User.find({}, function(err, users) {
        if(err) throw err;
        var user_info = [];
        for(var i=0; i<users.length; i++) {
          user_info.push({"firstName": users[i].firstName, "lastName": users[i].lastName, "username": users[i].username});
        }
        Tag.find({}, function(err, tags) {
          res.render('create-a-new-org', {users: user_info, admin: req.user.admin, tags: tags});
        })
      })
    }
  } else {
    res.redirect('/');
  }
});

//Send information in URL to invite page
router.post('/group-invite', function(req, res) {
  console.log(req.body);
  var name = encodeURIComponent(req.body.name);
  var description = encodeURIComponent(req.body.description);
  var admin = encodeURIComponent(req.body.admin);
  var tags = encodeURIComponent(req.body.tags);
  res.redirect('/create-a-new-org-invite/?name=' + name + '&description=' + description + '&admin=' + admin + '&tags=' + tags);
})

//Render invite page
router.get('/create-a-new-org-invite', function(req, res) {
  if(req.user && !req.user.verified) {
    res.redirect('/not-verified');
  }
  else if(req.user) {
    if(req.user.blocked) {
      res.redirect('/');
    } else {
      User.find({}, function(err, users) {
        if(err) throw err;
        var user_info = [];
        for(var i=0; i<users.length; i++) {
          if(req.user.username!=users[i].username) {
            user_info.push({"firstName": users[i].firstName, "lastName": users[i].lastName, "username": users[i].username, "major": users[i].major, "classYear": users[i].classYear});
          }
        }
        res.render('create-a-new-org-invite', {tags: req.query.tags, name: req.query.name, description: req.query.description, groupAdmin: req.query.admin, users: user_info, admin: req.user.admin});
      })
    }
  } else {
    res.redirect('/');
  }
})

router.get('/organizations', function(req, res) {
  if(req.user && !req.user.verified) {
    res.redirect('/not-verified');
  }
  else if(req.user) {
    Group.find({'archive': false, '_id': {$nin: req.user.viewBlockedGroups}}, function(err, groups) {
      console.log(groups);
      res.render('org-list', {groups: groups, admin: req.user.admin});
    })
  } else {
    res.redirect('/');
  }
})
router.post('/groups/:id/deactivate', function(req, res) {
  Group.findById(req.params.id, function(err, group) {
    if(err) throw err;
    group.active = false;
    group.save(function(err, updatedGroup) {
      if(err) throw err;
      let notificationToMembers = new Notification({
        type: 'Deactivated Organization',
        message: "The Organization, " + updatedGroup.name + ", that you are a part of has been deactivated.",
        routeID: {
          kind: 'Group',
          id: updatedGroup._id
        }
      })
      notificationToMembers.save(function(err, notificationToMembers) {
        if(err) throw err;
        User.findOneAndUpdate({_id: updatedGroup.members}, {$push: {notifications: notificationToMembers._id}}, function(err) {
          if (err) throw (err);
        })
        res.redirect('/groups/' + updatedGroup._id);
      })
    })
  })
})

router.post('/groups/:id/reactivate', function(req, res) {
  Group.findById(req.params.id, function(err, group) {
    if(err) throw err;
    group.active = true;
    group.save(function(err, updatedGroup) {
      if(err) throw err;
      let notificationToMembers = new Notification({
        type: 'Reactivated Organization',
        message: "The Organization, " + updatedGroup.name + ", that you are a part of has been reactivated.",
        routeID: {
          kind: 'Group',
          id: updatedGroup._id
        }
      })
      notificationToMembers.save(function(err, notificationToMembers) {
        if(err) throw err;
        User.findOneAndUpdate({_id: updatedGroup.members}, {$push: {notifications: notificationToMembers._id}}, function(err) {
          if (err) throw (err);
        })
        res.redirect('/groups/' + updatedGroup._id);
      })
    })
  })
})

router.post('/groups/:id/delete', function(req, res) {
  Group.findById(req.params.id, function(err, group) {
    if(err) throw err;
    group.archive = true;
    group.save(function(err, updatedGroup) {
      if(err) throw err;
      let notificationToMembers = new Notification({
        type: 'Deleted Organization',
        message: "The Organization, " + updatedGroup.name + ", that you are a part of has been deleted.",
        routeID: {
          kind: 'Group',
          id: updatedGroup._id
        }
      })
      notificationToMembers.save(function(err, notificationToMembers) {
        if(err) throw err;
        User.findOneAndUpdate({_id: updatedGroup.members}, {$push: {notifications: notificationToMembers._id}}, function(err) {
          if (err) throw (err);
        })
        res.redirect('/');
      })
    })
  })
})

//Get info for sidenav
router.get('/groupinfo', function(req, res) {
  Group.find({}, function(err, groups) {
    if(err) throw err;
    var info = [];
    for(var i=0; i<groups.length; i++) {
      if(groups[i].archive==false) {
        info.push({"name": groups[i].name, "_id": groups[i]._id, "active": groups[i].active, admin: req.user.admin});
      }
    }
    res.send(info);
  });
});

//Retrieve group page
router.get('/groups/:id', function(req, res) {
  if(req.user && !req.user.verified) {
    res.redirect('/not-verified');
  }
  else if(req.user) {
    if(req.user.viewBlockedGroups.indexOf(req.params.id)!=-1) {
      res.redirect('/');
    } else {
      Group.findById(req.params.id).populate('members').exec(function(err, group) {
        if (err) {
          throw err;
        } else {
          let members = group.members.map(function(member) {
            return {id: member._id, username: member.username, firstName: member.firstName, lastName: member.lastName};
          })
          let adminUsername = group.admin;
          Post.find({postingGroup: req.params.id}).populate([{path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]).populate('tags').exec(function(err, posts) {
            if(err) throw err;
            Event.find({postingGroup: req.params.id}).populate([{path: 'attendees'}, {path: 'comments', populate: [{path: 'postedBy'},{path: 'comments', populate: [{path: 'postedBy'}]}]}]).populate('tags').exec(function(err, events) {
              if(err) throw err;
              let contents = [];
              contents = contents.concat(events);
              contents = contents.concat(posts);
              let sortedContents = quickSort(contents, 0, contents.length-1);
              sortedContents.reverse();
              pages = [];
              numPages = 0;
              currentPage = 0;
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
                      "createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
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
                      "createdAt": moment(item.createdAt).tz("America/New_York").format('MMMM D, YYYY, h:mm a'),
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
                      "own": req.user.username === item.postedBy,
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
                      "own": req.user.username === item.postedBy,
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
                        "own": req.user.username === item.postedBy,
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
                        "own": req.user.username === item.postedBy,
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
              })
              Promise.all(feed).then(function(feed) {
                User.find({username: adminUsername}, function(err, user) {
                  if (err) {
                    throw err;
                  } else if (user) {
                    let admin = {id: user._id, username: user.username, firstName: user.firstName, lastName: user.lastName};
                    res.render('org-detail', {
                      groupAdmin: req.user.username === admin.username,
                      member: req.user.joinedGroups.indexOf(group._id) > -1,
                      admin: req.user.admin,
                      group: {
                        "id": group._id,
                        "name": group.name,
                        "description": group.description,
                        "active": group.active,
                        "admin": user[0],
                        "members": members
                      },
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
                  } else {
                    res.render('org-detail', {
                      groupAdmin: req.user.username === admin.username,
                      member: req.user.joinedGroups.indexOf(group._id) > -1,
                      admin: req.user.admin,
                      group: {
                        "id": group._id,
                        "name": group.name,
                        "description": group.description,
                        "active": group.active,
                        "admin": adminUsername,
                        "members": members
                      }, contents: feed, pages: pages, currentPage: currentPage, user: req.user._id, helpers: {
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
                  }
                })
              })
            })
          })
        }
      })
    }
  } else {
    res.redirect('/');
  }
})

//Render edit group page
router.get('/groups/:id/edit', function(req, res) {
  if(req.user && !req.user.verified) {
    res.redirect('/not-verified');
  }
  else if(req.user) {
    Group.findById(req.params.id, function(err, group) {
      if(err) throw err;
      User.find({}, function(err, users) {
        if(err) throw err;
        var user_info = [];
        var group_members=[];
        for(var i=0; i<users.length; i++) {
          if(group.members.indexOf(users[i]._id)>-1) {
            group_members.push({"firstName": users[i].firstName, "lastName": users[i].lastName, "username": users[i].username, "major": users[i].major, "classYear": users[i].classYear});
          } else {
            user_info.push({"firstName": users[i].firstName, "lastName": users[i].lastName, "username": users[i].username, "major": users[i].major, "classYear": users[i].classYear});
          }
        }
        res.render('edit-org', {admin: req.user.admin, id: req.params.id, name: group.name, description: group.description, groupAdmin: group.admin, active: group.active, users: user_info, members: group_members, helpers: {
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
      })
    })
  } else {
    res.redirect('/');
  }
})

//Edit group page
router.post('/groups/:id/edit', function(req, res) {
  console.log(req.body);
	Group.findById(req.params.id, function(error, group) {
		if (error)
			throw error;
		group.description = req.body.description;
    group.name = req.body.name;
    var addMembers = req.body.addMembers.split(',');
    var removeMembers = req.body.removeMembers.split(',');
    for(var i=0; i<removeMembers.length; i++) {
      for(var j=0; j<addMembers.length; j++) {
        if(removeMembers[i]==addMembers[j]) {
          addMembers.splice(j, 1);
          removeMembers.splice(i, 1);
        }
      }
    }
    console.log(addMembers);
    if(group.admin==req.body.admin) {
      User.find({'username': addMembers}, function(err, members) {
        console.log(members);
        for(var i=0; i<members.length; i++) {
          group.members.push(members[i]._id);
        }
        User.find({'username': removeMembers}, function(err, removedMembers) {
          for(var i=0; i<removedMembers.length; i++) {
            group.members.splice(group.members.indexOf(removedMembers[i]._id), 1);
          }
          group.save(function(err, updatedGroup) {
            if(err) throw err;
            for(var i=0; i<members.length; i++) {
              members[i].joinedGroups.push(updatedGroup._id);
              var newNotification = new Notification({
                type: 'Added to Organization',
                message: "You have been added to a new Organization, " + updatedGroup.name + ".",
                routeID: {
                  kind: 'Group',
                  id: updatedGroup._id
                }
              });
              members[i].save(function(err, updatedUser) {
                if(err) throw err;
                newNotification.save(function(err, notification) {
                  if(err) throw err;
                  updatedUser.notifications.push(notification._id);
                  updatedUser.save(function(err, completeUser) {
                    if(err) throw err;
                  })
                })
              });
            }
            res.redirect('/groups/' + updatedGroup._id);
          })
        })
      })
    } else {
      var oldAdmin = group.admin;
      group.admin = req.body.admin;
      User.findOneAndUpdate({'username': oldAdmin}, {$pull: {adminGroups: group._id}}, function(err) {
        if(err) throw err;
        User.findOneAndUpdate({'username': group.admin}, {$push: {adminGroups: group._id}}, function(err) {
          if(err) throw err;
          User.find({'username': addMembers}, function(err, members) {
            for(var i=0; i<members.length; i++) {
              group.members.push(members[i]._id);
            }
            group.save(function(err, updatedGroup) {
              if(err) throw err;
              for(var i=0; i<members.length; i++) {
                members[i].joinedGroups.push(updatedGroup._id);
                var newNotification = new Notification({
                  type: 'Added to Organization',
                  message: "You have been added to a new Organization, " + updatedGroup.name + ".",
                  routeID: {
                    kind: 'Group',
                    id: updatedGroup._id
                  }
                });
                members[i].save(function(err, updatedUser) {
                  if(err) throw err;
                  newNotification.save(function(err, notification) {
                    if(err) throw err;
                    updatedUser.notifications.push(notification._id);
                    updatedUser.save(function(err, completeUser) {
                      if(err) throw err;
                    })
                  })
                });
              }
              res.redirect('/groups/' + updatedGroup._id);
            })
          })
        })
      })
    }
	})
})

//Join group
router.post('/groups/:id/join', function(req, res) {
  Group.findOneAndUpdate({_id: req.params.id}, {$push: {members: req.user._id}}, function(err, group) {
    if (err) {
      throw err;
    } else {
      User.findOneAndUpdate({_id: req.user._id}, {$push: {joinedGroups: group._id}}, function(err, user) {
        if (err) {
          throw err;
        } else {
          res.json({success: true});
        }
      })
    }
  })
})

//Leave group
router.post('/groups/:id/leave', function(req, res) {
  Group.findOneAndUpdate({_id: req.params.id}, {$pull: {members: req.user._id}}, function(err, group) {
    if (err) {
      throw err;
    } else {
      User.findOneAndUpdate({_id: req.user._id}, {$pull: {joinedGroups: group._id}}, function(err, user) {
        if (err) {
          throw err;
        } else {
          res.json({success: true});
        }
      })
    }
  })
})

module.exports = router;
