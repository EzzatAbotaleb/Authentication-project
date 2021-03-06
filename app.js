//jshint esversion:6
require("dotenv").config();
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( "passport-google-oauth2" ).Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");
/*const bcrypt = require("bcrypt");
const saltRounds = 10 */

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true , useUnifiedTopology:true});
mongoose.set("useCreateIndex" , true);
 const userSchema = new mongoose.Schema ({
     email : String,
     password : String,
     googleId: String,
     facebookId: String,
     secret:String
 });
 userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
 const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
// app instance

const app = express();

// MiddleWare

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));
app.set("view engine", "ejs");

app.use(session({
    secret : 'this is our little secret',
    resave : false,
    saveUninitialized : false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret:   process.env.CLIENT_SECRETS,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
// facebook Oauth
passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
// Routes

app.get("/" , function(req , res){
    res.render("home");
});

app.get("/auth/google" ,
passport.authenticate("google" , {scope:["profile"]})
);

app.get( "/auth/google/secrets",
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/register" , function(req , res){
   
    res.render("register");
});

app.get("/login" , function(req , res){
    res.render("login");
});

app.get("/secrets" , function(req , res){
    
    User.find({"secret": {$ne:null}}, function(err , foundUsers){
    if (err){
        console.log(err);
    }else{
        if(foundUsers){
            res.render("secrets" , {usersWithSecrets:foundUsers});
        }
    }
    });

});
app.get("/logout" , function(req , res){
    req.logOut();
    res.redirect("/");
});

app.get("/submit", function(req , res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/register" , function(req , res){
    User.register({username: req.body.username} , req.body.password , function(err , user){
        if (err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req , res , function(){
                res.redirect("secrets");
            })
        }
    });
});

app.post("/login" , function(req , res){
    const user = new User({
        username : req.body.username,
        password : req.body.password
    });
    req.login(user , function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req , res , function(){
                res.redirect("secrets");
            })
        }
    })
});

app.post("/submit" , function(req , res){
   submittedSecret = req.body.secret
   User.findById(req.user.id,function(err , foundUser){
       if(err){
           console.log(err);
       }else{
           if(foundUser){
               foundUser.secret=submittedSecret;
               foundUser.save(function(){
                   res.redirect("/secrets")
               });
           }
       }
   }); 
});
// PORT

app.listen(3000 , function(){
    console.log("server is running successfully on port 3000");
});