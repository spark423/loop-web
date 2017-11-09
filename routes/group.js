var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');

router.post('/groups/create', function(req, res) {
  var newGroup = new Group({
    name: req.body.name,
    description: req.body.description
  });
  newGroup.save(function(err, newBoard) {
    if(err) throw err;
  })
  res.redirect('/home');
})

router.get('/groupinfo', function(req, res) {
  Group.find({}, function(err, groups) {
    if(err) throw err;
    var info = [];
    for(var i=0; i<groups.length; i++) {
      info.push({"name": groups[i].name, "_id": groups[i]._id});
    }
    res.send(info);
  });
});

//Retrieve group page
router.get('/groups/:id', function(req, res) {
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
          res.json({
            admin: req.user.username === admin.username,
            member: req.user.joinedGroups.indexOf(group._id) > -1,
            group: {
              "id": group._id,
              "name": group.name,
              "description": group.description,
              "admin": user,
              "members": members
            }
          })
        }	 else {
          res.json({
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
})
/*
router.get('/groups/:id', function(req, res) {
	Group.findById(req.params.id).populate('admin').populate('members').exec(function(error, group) {
		if (error)
			throw error;
		var adminOfGroup = false
		var member = false
		var memberIds = []
		for (var i=0; i<group.members.length; i++) {
			memberIds.push(group.members[i]._id.toString())
		}
		if (group.admin._id.toString() === req.user._id.toString()) {
			adminOfGroup = true
		}

		if (memberIds.indexOf(req.user._id.toString()) > -1) {
			member = true
		}
		res.render('org-detail', {name: group.name, _id: group._id, description: group.description, admin: group.admin, adminOfGroup: adminOfGroup, member: member, members: group.members})
	})
})*/

//Edit group page
router.post('/groups/:id/edit', function(req, res) {
	Group.findById(req.params.id, function(error, group) {
		if (error)
			throw error;
		if (req.body.description) {
 		   group.description = req.body.description;
		}
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
/*
router.post('/groups/:id/join', function(req, res) {
	Group.findById(req.params.id, function(error, group) {
		if (error)
			throw error;
		group.members.push(req.user._id)
		group.save(function(error, updatedGroup) {
			if (error)
				throw error;
			User.findById(req.user._id, function(error, user) {
				user.joinedGroups.push(updatedGroup._id)
				user.save(function(error, updatedUser) {
					if (error)
						throw error;
					res.redirect('/groups/'+updatedGroup._id)
				})
			})
		})
	})
})*/

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
/*
router.post('/groups/:id/leave', function(req, res) {
	Group.findById(req.params.id, function(error, group) {
		if (error)
			throw error;
		var groupMembers = group.members
		var index = groupMembers.indexOf(req.user._id)
		group.members = groupMembers.slice(0,index).concat(groupMembers.slice(index+1, groupMembers.length))
		group.save(function(error, updatedGroup) {
			if (error)
				throw error;
			User.findById(req.user._id, function(error, user) {
				if (error)
					throw error;
				var userJoinedGroups = user.joinedGroups
				var index =  userJoinedGroups.indexOf(updatedGroup._id)
				user.joinedGroups = userJoinedGroups.slice(0, index).concat(userJoinedGroups.slice(index+1, userJoinedGroups.length))
				user.save(function(error, updatedUser) {
					if (error)
						throw error;
					res.redirect('/groups/'+updatedGroup._id)
				})
			})
		})
	})
})*/

module.exports = router;
