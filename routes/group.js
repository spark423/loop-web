var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Notification = require('../models/notification');

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
    for(var i=0; i<members.length; i++) {
      newGroup.members.push(members[i]._id);
    }
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
            item: newGroup._id
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

//Page for creating group
router.get('/create-a-new-org', function(req, res) {
  if(req.user) {
    User.find({}, function(err, users) {
      if(err) throw err;
      var user_info = [];
      for(var i=0; i<users.length; i++) {
        user_info.push({"firstName": users[i].firstName, "lastName": users[i].lastName, "username": users[i].username});
      }
      res.render('create-a-new-org', {users: user_info});
    })
  } else {
    res.redirect('/');
  }
});

//Send information in URL to invite page
router.post('/group-invite', function(req, res) {
  var name = encodeURIComponent(req.body.name);
  var description = encodeURIComponent(req.body.description);
  var admin = encodeURIComponent(req.body.admin);
  res.redirect('/create-a-new-org-invite/?name=' + name + '&description=' + description + '&admin=' + admin);
})

//Render invite page
router.get('/create-a-new-org-invite', function(req, res) {
  if(req.user) {
    User.find({}, function(err, users) {
      if(err) throw err;
      var user_info = [];
      for(var i=0; i<users.length; i++) {
        if(req.user.username!=users[i].username) {
          user_info.push({"firstName": users[i].firstName, "lastName": users[i].lastName, "username": users[i].username, "major": users[i].major, "classYear": users[i].classYear});
        }
      }
      res.render('create-a-new-org-invite', {name: req.query.name, description: req.query.description, admin: req.query.admin, users: user_info});
    })
  } else {
    res.redirect('/');
  }
})

router.post('/groups/:id/delete', function(req, res) {
  Group.findById(req.params.id, function(err, group) {
    if(err) throw err;
    group.archived = true;
    group.save(function(err, updatedGroup) {
      if(err) throw err;
      res.redirect('/');
    })
  })
})

//Get info for sidenav
router.get('/groupinfo', function(req, res) {
  Group.find({}, function(err, groups) {
    if(err) throw err;
    var info = [];
    for(var i=0; i<groups.length; i++) {
      info.push({"name": groups[i].name, "_id": groups[i]._id, "archived": groups[i].archived});
    }
    res.send(info);
  });
});

//Retrieve group page
router.get('/groups/:id', function(req, res) {
  if(req.user) {
    Group.findById(req.params.id).populate('members').exec(function(err, group) {
      if (err) {
        throw err;
      } else {
        let members = group.members.map(function(member) {
          return {id: member._id, username: member.username, firstName: member.firstName, lastName: member.lastName};
        })
        let adminUsername = group.admin;
        User.find({username: adminUsername}, function(err, user) {
          if (err) {
            throw err;
          } else if (user) {
            let admin = {id: user._id, username: user.username, firstName: user.firstName, lastName: user.lastName};
            res.render('org-detail', {
              admin: req.user.username === admin.username,
              member: req.user.joinedGroups.indexOf(group._id) > -1,
              group: {
                "id": group._id,
                "name": group.name,
                "description": group.description,
                "admin": user[0],
                "members": members
              }
            })
          } else {
            res.render('org-detail', {
              admin: req.user.username === admin.username,
              member: req.user.joinedGroups.indexOf(group._id) > -1,
              group: {
                "id": group._id,
                "name": group.name,
                "description": group.description,
                "admin": adminUsername,
                "members": members
              }
            })
          }
        })
      }
    })
  } else {
    res.redirect('/');
  }
})

//Render edit group page
router.get('/groups/:id/edit', function(req, res) {
  if(req.user) {
    Group.findById(req.params.id, function(err, group) {
      if(err) throw err;
      User.find({}, function(err, users) {
        if(err) throw err;
        var user_info = [];
        for(var i=0; i<users.length; i++) {
          user_info.push({"firstName": users[i].firstName, "lastName": users[i].lastName, "username": users[i].username});
        }
        res.render('edit-org', {id: req.params.id, name: group.name, description: group.description, admin: group.admin, users: user_info, helpers: {
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
	Group.findById(req.params.id, function(error, group) {
		if (error)
			throw error;
		group.description = req.body.description;
    group.name = req.body.name;
    group.admin = req.body.admin;
		group.save(function(error, updatedGroup) {
			if (error)
				throw error;
			res.redirect('/groups/' + updatedGroup._id)
		})
	})
})

//Join group
router.put('/groups/:id/join', function(req, res) {
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
router.put('/groups/:id/leave', function(req, res) {
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
