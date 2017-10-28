var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Request = require('../models/request');
var Notification = require('../models/notification')

router.get('/requests', function(req, res) {
  User.findById(req.user._id).populate({path: 'requests', populate: {path: 'sender', model: 'User'}}).exec(function(error, user) {
  	console.log("requests", user.requests)
   	res.render('approval', {requests: user.requests})
  })
})

router.post('/request', function(req, res) {
	var request = new Request({
      sender: req.user._id,
      preferredName: req.body.preferredName
    })
  request.save(function(error, madeRequest) {
    if (error)
      throw error;
    User.findOne({admin: true}, function(error, user) {
      if (error)
        throw error;
      console.log(user.requests)
      user.requests.push(madeRequest._id)
      user.save(function(error, updatedUser) {
        if (error)
          throw error;
        res.redirect('/settings')          
      })
    })
  })
})


router.post('/requests/:id/approve', function(req, res) {
	Request.findById(req.params.id, function(error, request) {
		if (error)
			throw error;
		User.findById(request.sender, function(error, user) {
			if (error)
				throw error;
			user.preferredName = request.preferredName
			user.save(function(error, updatedUser) {
				User.findOne({admin: true}, function(error, admin) {
					if (error)
						throw error;
					var adminRequests = admin.requests
					var index = adminRequests.indexOf(request._id)
					admin.requests = adminRequests.slice(0, index).concat(adminRequests.slice(index+1, adminRequests.length))
					admin.save(function(error, admin) {
						if (error)
							throw error;
						res.redirect('back')
					})
				})
			})
		})
	})
})

module.exports = router;