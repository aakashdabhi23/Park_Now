require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const _=require("lodash");
const path=require('path');
const passport = require("passport");
const cookieParser = require("cookie-parser");
const indexControllers = require("./controllers/indexControllers");
const userControllers = require("./controllers/userControllers");
const ownerControllers = require("./controllers/ownerControllers");
const methodOverride = require('method-override');
const session = require('express-session');
const flash= require('connect-flash');

const app = express();
app.use(passport.initialize());
app.use(cookieParser());

app.use(methodOverride('_method'));

const db = process.env.DBURI;

// Connect to mongo
mongoose
	.connect(db, { useNewUrlParser: true, useUnifiedTopology: true,useFindAndModify: false })
	.then(() => {
		const PORT = process.env.PORT || 8080;
		app.listen(PORT, console.log("Server Started"));
		console.log("Connected to DB");
	})
	.catch((err) => {
		console.log(err);
	});

require("./config/passport")(passport);

app.set("view engine", "ejs");
app.set('views',path.join(__dirname,'views'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true,
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use((req,res,next)=>{
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

app.use("/", indexControllers);
app.use(
	"/user",
	passport.authenticate("jwt_user", { session: false }),
	userControllers
);
app.use(
	"/owner",
	passport.authenticate("jwt_owner", { session: false }),
	ownerControllers
);

  app.listen(3000,function()
{
  console.log("Server is running on port 3000");
});