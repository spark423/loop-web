var express = require('express');
var router = express.Router();
var lunr = require('lunr')
var User = require('../models/user')

router.get('/practice', function(req, res) {
	User.find().exec(function(error, users) {
		if (error)
			throw error;
		var documents = []
		for (var i=0; i<users.length; i++) {
		  documents.push({"name": users[i].firstName + " " + users[i].lastName, "user": users[i]})			
		}
		console.log("documents", documents)
    var idx = lunr(function () {
    	this.ref('name')
    	this.field('name')
	    documents.forEach(function (doc) {
	    	this.add(doc)
        }, this)
    })
    console.log("results", idx.search("Seo"))		
	})
})

module.exports = router;