var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var Group = require('../models/group')
var User = require('../models/user');

module.exports = function(passport) {
	router.get('/groups/:id', passport.authenticate('jwt', { session: false }), function(req, res) {
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
						let admin = {"id": user._id, "firstName": user.firstName, "lastName": user.lastName, "username": user.username, "isLoopUser": true};
						res.json({
							admin: req.user.username === admin.username,
						  member: req.user.joinedGroups.indexOf(group._id) > -1, 
						  group: {
							  "id": group._id,
							  "name": group.name,
							  "description": group.description,
							  "admin": admin,
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
							  "admin": {"id": "", "firstName": "", "lastName": "", "username": adminUsername, "isLoopUser": false},
							  "members": members
              }
			      })		
					}
				})
			}
		})
	})

	router.put('/groups/:id/join', passport.authenticate('jwt', { session: false }), function(req, res) {
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

	router.put('/groups/:id/leave', passport.authenticate('jwt', { session: false }), function(req, res) {
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


	return router;
}