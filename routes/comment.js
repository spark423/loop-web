var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Comment = require('../models/comment')
var Notification = require('../models/notification')

router.post('/comments/:id/flag', function(req, res) {
  	Comment.findOneAndUpdate({_id: req.params.id}, {$set: {flagged: true}},function(err,comment) {
			if(comment.source.kind=="Event") {
				Event.findById(comment.source.item, function(err, event) {
					let notificationToPoster = new Notification({
		  			type: 'Flagged Comment',
		  			message: "Your comment on the event titled \"" + event.title + "\" has been flagged. Please wait for the admin's review.",
		  			routeID: {
		  				kind: 'Comment',
		  				id: comment._id,
		          boardId: event.board
		  			}
		      })
		      notificationToPoster.save(function(err, notificationToPoster) {
		      	if (err) {
		      		throw err;
		      	} else {
		      		User.findOneAndUpdate({_id: comment.postedBy}, {$push: {notifications: notificationToPoster}}, function(err,user) {
		      			if (err) {
		      				throw err;
		      			} else {
		      				let notificationToAdmin = new Notification({
		      					type: "Flagged Comment",
		      					message: "The comment on the event titled \"" + event.title + "\" has been flagged.",
		      					routeID: {
		      						kind: 'Comment',
		      						id: comment._id,
		                  boardId: event.board
		      					}
		      				})
		      				notificationToAdmin.save(function(err, notificationToAdmin) {
		      					if (err) {
		      						throw err;
		      					} else {
		      						User.updateMany({admin: true}, {$push: {notifications: notificationToAdmin}}, function(err, admin) {
		      							if (err) {
		      								throw err;
		      							} else {
		                      Board.findOneAndUpdate({_id: event.board}, {$push: {notifications: notificationToAdmin}}, function(err, originBoard) {
		                        if (err) {
		                          throw err;
		                        } else {
		                          res.redirect('back');
		                        }
		                      })
		      							}
		      						})
		      					}
		      				})
		      			}
		      		})
		      	}
		      })
				})
			} else if (comment.source.kind=="Post") {
				Post.findById(comment.source.item, function(err, post) {
					let notificationToPoster = new Notification({
		  			type: 'Flagged Comment',
		  			message: "Your comment on the post, \"" + post.text + "\" has been flagged. Please wait for the admin's review.",
		  			routeID: {
		  				kind: 'Comment',
		  				id: comment._id,
		          boardId: post.board
		  			}
		      })
		      notificationToPoster.save(function(err, notificationToPoster) {
		      	if (err) {
		      		throw err;
		      	} else {
		      		User.findOneAndUpdate({_id: comment.postedBy}, {$push: {notifications: notificationToPoster}}, function(err,user) {
		      			if (err) {
		      				throw err;
		      			} else {
		      				let notificationToAdmin = new Notification({
		      					type: "Flagged Comment",
		      					message: "The comment on the post, \"" + post.text + "\" has been flagged.",
		      					routeID: {
		      						kind: 'Comment',
		      						id: comment._id,
		                  boardId: post.board
		      					}
		      				})
		      				notificationToAdmin.save(function(err, notificationToAdmin) {
		      					if (err) {
		      						throw err;
		      					} else {
		      						User.updateMany({admin: true}, {$push: {notifications: notificationToAdmin}}, function(err, admin) {
		      							if (err) {
		      								throw err;
		      							} else {
		                      Board.findOneAndUpdate({_id: post.board}, {$push: {notifications: notificationToAdmin}}, function(err, originBoard) {
		                        if (err) {
		                          throw err;
		                        } else {
		                          res.redirect('back');
		                        }
		                      })
		      							}
		      						})
		      					}
		      				})
		      			}
		      		})
		      	}
		      })
				})
			} else {
				Comment.findById(comment.source.item, function(err, parentComment) {
					if(parentComment.source.kind=="Event") {
						Event.findById(parentComment.source.item, function(err, event) {
							let notificationToPoster = new Notification({
				  			type: 'Flagged Comment',
				  			message: "Your comment on the event titled \"" + event.title + "\" has been flagged. Please wait for the admin's review.",
				  			routeID: {
				  				kind: 'Comment',
				  				id: comment._id,
				          boardId: event.board
				  			}
				      })
				      notificationToPoster.save(function(err, notificationToPoster) {
				      	if (err) {
				      		throw err;
				      	} else {
				      		User.findOneAndUpdate({_id: comment.postedBy}, {$push: {notifications: notificationToPoster}}, function(err,user) {
				      			if (err) {
				      				throw err;
				      			} else {
				      				let notificationToAdmin = new Notification({
				      					type: "Flagged Comment",
				      					message: "The comment on the event titled \"" + event.title + "\" has been flagged.",
				      					routeID: {
				      						kind: 'Comment',
				      						id: comment._id,
				                  boardId: event.board
				      					}
				      				})
				      				notificationToAdmin.save(function(err, notificationToAdmin) {
				      					if (err) {
				      						throw err;
				      					} else {
				      						User.updateMany({admin: true}, {$push: {notifications: notificationToAdmin}}, function(err, admin) {
				      							if (err) {
				      								throw err;
				      							} else {
				                      Board.findOneAndUpdate({_id: event.board}, {$push: {notifications: notificationToAdmin}}, function(err, originBoard) {
				                        if (err) {
				                          throw err;
				                        } else {
				                          res.redirect('back');
				                        }
				                      })
				      							}
				      						})
				      					}
				      				})
				      			}
				      		})
				      	}
				      })
						})
					} else {
						Post.findById(parentComment.source.item, function(err, post) {
							let notificationToPoster = new Notification({
				  			type: 'Flagged Comment',
				  			message: "Your comment on the post, \"" + post.text + "\" has been flagged. Please wait for the admin's review.",
				  			routeID: {
				  				kind: 'Comment',
				  				id: comment._id,
				          boardId: post.board
				  			}
				      })
				      notificationToPoster.save(function(err, notificationToPoster) {
				      	if (err) {
				      		throw err;
				      	} else {
				      		User.findOneAndUpdate({_id: comment.postedBy}, {$push: {notifications: notificationToPoster}}, function(err,user) {
				      			if (err) {
				      				throw err;
				      			} else {
				      				let notificationToAdmin = new Notification({
				      					type: "Flagged Comment",
				      					message: "The comment on the post, \"" + post.text + "\" has been flagged.",
				      					routeID: {
				      						kind: 'Comment',
				      						id: comment._id,
				                  boardId: post.board
				      					}
				      				})
				      				notificationToAdmin.save(function(err, notificationToAdmin) {
				      					if (err) {
				      						throw err;
				      					} else {
				      						User.updateMany({admin: true}, {$push: {notifications: notificationToAdmin}}, function(err, admin) {
				      							if (err) {
				      								throw err;
				      							} else {
				                      Board.findOneAndUpdate({_id: post.board}, {$push: {notifications: notificationToAdmin}}, function(err, originBoard) {
				                        if (err) {
				                          throw err;
				                        } else {
				                          res.redirect('back');
				                        }
				                      })
				      							}
				      						})
				      					}
				      				})
				      			}
				      		})
				      	}
				      })
						})
					}
				})
			}
  	})
  })

router.get('/comments/:id', function(req, res) {
	Comment.findById(req.params.id, function(err, comment) {
		if(comment.source.kind=="Event") {
			res.redirect('/event/' + comment.source.item);
		} else if(comment.source.kind=="Post") {
			Post.findById(comment.source.item, function(err, post) {
				Board.findById(post.board, function(err, board) {
					res.redirect('/boards/' + board._id + '#' + post._id);
				})
			})
		}
	})
});

//Editing comment
router.post('/comments/:id/edit', function(req, res) {
	Comment.findById(req.params.id, function(err, comment) {
		if(err) throw err;
		comment.text=req.body.text;
		comment.save(function(err, updatedComment) {
			if(err) throw err;
			res.status(200);
		})
	})
});

router.post('/comments/:id/unflag', function(req, res) {
	Comment.findById(req.params.id).populate('source.item').exec(function(err, comment) {
		comment.flagged = false;
		comment.save(function(err, updatedComment) {
			Board.findById(updatedComment.source.item.board).populate('notifications').exec(function(err, board) {
				for(var i=0; i<board.notifications.length; i++) {
					if(board.notifications[i].routeID.id.toString() == updatedComment._id.toString()) {
						board.notifications.splice(i, 1);
						board.save(function(err, updatedBoard) {
							res.redirect('/boards/' + updatedBoard._id);
						})
					}
				}
			})
		})
	})
})

router.post('/comments/:id/delete', function(req, res) {
	Comment.findById(req.params.id, function(err, comment) {
		if (err) {
			throw err;
		} else {
			comment.archive=true;
			comment.save(function(err, updatedComment) {
				if (updatedComment.source.kind === 'Post') {
					Post.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, post) {
						if (err) {
							throw err;
						}
						Board.findById(post.board).populate('notifications').exec(function(err, board) {
							for(var i=0; i<board.notifications.length; i++) {
								if(board.notifications[i].routeID.id.toString() == updatedComment._id.toString()) {
									board.notifications.splice(i, 1);
									board.save(function(err, updatedBoard) {
										res.redirect('/boards/' + updatedBoard._id);
									})
								}
							}
						})
					})
				} else if (updatedComment.source.kind === 'Event') {
					Event.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, event) {
						if (err) {
							throw err;
						}
						Board.findById(post.board).populate('notifications').exec(function(err, board) {
							for(var i=0; i<board.notifications.length; i++) {
								if(board.notifications[i].routeID.id.toString() == updatedComment._id.toString()) {
									board.notifications.splice(i, 1);
									board.save(function(err, updatedBoard) {
										res.redirect('/boards/' + updatedBoard._id);
									})
								}
							}
						})
					})
				}
			})
		}
	})
})
/*router.post('/comments/:id/edit', function(req, res) {
	Comment.findById(req.params.id, function(error, comment) {
		if (error)
			throw error
		if (req.body.text) {
			comment.text = req.body.text
		}
		comment.save(function(error, updatedComment) {
			if (error)
				throw error;
			if (updatedComment.upperComment) {
				Comment.findById(updatedComment.upperComment, function(error, upperComment) {
					if (error)
						throw error;
					if (upperComment.event) {
						Event.findById(upperComment.event, function(error, event) {
							if (error)
								throw error;
							res.redirect('/boards/' + event.board)
						})
					} else {
					  Post.findById(upperComment.post, function(error, post) {
						  if (error)
							  throw error;
						  res.redirect('/boards/' + post.board)
					  })
					}
				})
			} else if (updatedComment.event) {
				Event.findById(updatedComment.event, function(error, event) {
					if (error)
						throw error;
					res.redirect('/boards/' + event.board)
				})
			} else {
			  Post.findById(updatedComment.post, function(error, post) {
			  	if (error)
				  	throw error;
				  res.redirect('/boards/' + post.board)
			  })
			}
		})
	})
})*/


//Deleting comment
router.post('/comments/:id', function(req, res) {
	Comment.findById(req.params.id, function(err, comment) {
		if (err) {
			throw err;
		} else if (comment.source.kind === 'Post') {
			Post.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, board) {
				if (err) {
					throw err;
				}
				res.redirect('/boards/' + board.board);
			})
		} else if (comment.source.kind === 'Event') {
			Event.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, board) {
				if (err) {
					throw err;
				}
				res.redirect('/boards/' + board.board);
			})
		} else {
			Comment.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, board) {
				if (err) {
					throw err;
				}
				res.redirect('/boards/' + board.source.item.source.item.board);
			})
		}
		comment.archive=true;
		comment.save(function(err, updatedComment) {
			if(err) throw err;
		})
	})
})

//Commeting on comment
router.post('/comments/:id/comment', function(req, res) {
	let newComment = new Comment({
		postedBy: req.user._id,
		source: {"kind": 'Comment', "item": req.params.id},
		text: req.body.text
	})
	newComment.save(function(err, newComment) {
		if (err) {
			throw err;
		}
		Comment.findOneAndUpdate({_id: req.params.id}, {$push: {comments: newComment._id}}, function(err, board) {
			if (err) {
				throw err;
			}
			User.findOneAndUpdate({_id: req.user._id}, {$push: {comments: newComment._id}}, function(err, user) {
				if (err) {
					throw err;
				}
				res.json({success: true})
			})
		});
	})
})

module.exports = router;
