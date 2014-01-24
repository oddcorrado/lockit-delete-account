
var path = require('path');
var bcrypt = require('bcrypt');

var debug = require('debug')('lockit-delete-account');
var utils = require('lockit-utils');

module.exports = function(app, config) {
  
  // load additional modules
  var db = utils.getDatabase(config);
  var adapter = require(db.adapter)(config);
  
  // shorten config
  var cfg = config.deleteAccount;
  
  // set default route
  var route = cfg.deleteAccountRoute || '/delete-account';
  
  // GET /delete-account
  app.get(route, utils.restrict(config), function(req, res) {
    debug('rendering GET /delete-account');

    // custom or built-in view
    var view = cfg.views.remove || path.join(__dirname, 'views', 'get-delete-account');
    
    res.render(view, {
      title: 'Delete account'
    });
  });
  
  // POST /delete-account
  app.post(route, utils.restrict(config), function(req, res) {
    debug('receiving data via POST request: %j', req.body);

    // verify input fields
    var username = req.body.username;
    var phrase = req.body.phrase;
    var password = req.body.password;

    var error = null;

    // check for valid inputs and valid session
    if (!username || !phrase || !password) {
      error = 'All fields are required';
    } else if (phrase !== 'please delete my account forever') {
      error = 'Phrase doesn\'t match';
    } else if (req.session.username !== username) {
      error = 'You can only delete your own account. Please enter your username';
    }

    // custom or built-in view
    var view = cfg.views.remove || path.join(__dirname, 'views', 'get-delete-account');

    if (error) {
      debug('Invalid input value: %s', error);
      
      res.status(403);
      res.render(view, {
        title: 'Delete account',
        error: error
      });
      return;
    }
    
    // get user from db
    adapter.find('username', username, function(err, user) {
      if (err) console.log(err);
      
      // no need to check if user exists in db since we are already checking against current session
      
      // verify user password
      bcrypt.compare(password, user.hash, function(err, valid) {
        debug('Password is valid: %s', valid);
        if (err) console.log(err);
        
        // compare hash with hash from db
        if (!valid) {

          res.status(403);
          res.render(view, {
            title: 'Delete account',
            error: 'Password is wrong'
          });
          return;

        }
        
        // delete user from db :(
        adapter.remove('username', username, function(err) {
          if (err) console.log(err);
          
          // kill session
          req.session = null;

          view = cfg.views.removed || path.join(__dirname, 'views', 'post-delete-account');

          // render success message
          res.render(view, {
            title: 'Account deleted'
          });
        });
        
      });

    });
    
  });
  
};