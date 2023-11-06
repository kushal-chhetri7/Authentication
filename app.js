require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const port = process.env.PORT || 3000;
const app = express();
   
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
})); 

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DATABASE_CONNECTION, { useNewUrlParser: true }).then(console.log("Success"));
// mongoose.set("useCreateIndex", true);

//Registration
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", function(req, res) {

    User.register({ username: req.body.username }, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect('/register')
                // res.send("You already have account on this email");
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect('/login')
            });
        }
    });

});

//register with google 

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SERECT,
        callbackURL: "http://localhost:3000/auth/google/home",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);

        User.findOrCreate({ googleId: profile.id }, function(err, user) {
            return cb(err, user);
        });
    }
));

//login with google

app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/home",
    passport.authenticate('google', { failureRedirect: "/login" }),
    function(req, res) {
        res.redirect("/home");
    });


//login

app.get('/login', (req, res) => {
    res.render('login')
});

app.post("/login", function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/home");
            });
        }
    });

});

app.get('/home', (req, res) => {
    res.render('home')
})

app.listen(port, () => {
    console.log(`Listening at port ${port} `)
})
