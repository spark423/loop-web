require('dotenv').config()
var express = require('express');
var app = express();
var router = express.Router();
var session = require('express-session')
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('./config/passport');
var flash = require('connect-flash');
var port = process.env.PORT || 3000;
var routes = require('./routes/routes');
var home = require('./routes/home');
var user = require('./routes/user');
var group = require('./routes/group');
var board = require('./routes/board');
var post = require('./routes/post');
var event = require('./routes/event');
var comment = require('./routes/comment');
var tag = require('./routes/tag');
var notification = require('./routes/notification')
var feed = require('./routes/feed')
var fileUpload = require('express-fileupload');


//Express configuration ==============================================================================================================================================================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
	        	secret: '밖에 비온다 주륵주륵',
                resave: false,
                saveUninitialized: false
            })
        );
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(fileUpload());

//View engine configuration =========================================================================================================================================================
/*var phpExpress = require('php-express')({
  binPath: 'php'
});
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', './views');
app.engine('php', phpExpress.engine);
app.set('view engine', 'php');
app.all(/.+\.php$/, phpExpress.router);*/

//View engine configuration =========================================================================================================================================================
var exphbs  = require('express-handlebars');
app.use(express.static(path.join(__dirname, 'public')));
app.engine('.hbs', exphbs({ defaultLayout: 'main', extname: '.hbs'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', '.hbs');


//Database configuration =============================================================================================================================================================
var mongoose = require('mongoose');
var MONGODB_URI = process.env.MONGODB_URI
mongoose.connect(MONGODB_URI);

//Routes =============================================================================================================================================================================
app.use(routes(passport))
app.use(home)
app.use(user)
app.use(group)
app.use(board)
app.use(post)
app.use(event)
app.use(comment)
app.use(notification)
app.use(feed)
app.use(tag)

app.get('/board', function(req, res) {
	res.render('board-overview');
});
app.get('/admin', function(req, res) {
	res.render('profile-admin-view');
})

app.get('/test', function(req, res) {
  if(req.user) {
    res.render('create-a-new-post', {user: req.user});
  }
  else {
    res.render('index');
  }
})

app.get('/event', function(req, res) {
  if(req.user) {
    res.render('create-a-new-event', {user: req.user});
  }
  else {
    res.render('index');
  }
})

app.get('/events', function(req, res) {
	res.render("event-detail");
})

app.get('/user', function(req, res) {
	res.render('profile-user');
})

//Error handling =====================================================================================================================================================================
app.use(function(req, res, next) {
  var err = new Error('Not found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    console.log(err.message);
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  console.log("error2");
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});



app.listen(process.env.PORT || 3000, function () {
  console.log('Express listening at', process.env.PORT || 3000);
  console.log(MONGODB_URI);
});

module.exports = app;
