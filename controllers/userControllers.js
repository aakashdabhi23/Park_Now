const { request } = require("express");
const express = require("express");
const router = express.Router();
const passport = require("passport");
const ParkingLocation=require("../models/Location");
var Userdb=require('../models/Users');
const bcrypt = require("bcryptjs");
const fs = require('fs');
const path = require('path');
const ejs=require('ejs');
const Review=require("../models/Review");
const _=require("lodash");
const bodyParser=require("body-parser");

// // Get form for update user
router.get('/:id/update-user',(req,res)=>{
    const id=req.params.id;
    Userdb.findById(id)
        .then(userdata=>{
            if(!userdata)
            {
                res.status(404).send({message:`not found user ${id}`})
            }
            else{
                res.render("update_user",{user:userdata})
            }
        })
        .catch(err=>{
            res.send(err);
        })
})

// Post for update user
router.post('/:id/update-user',(req,res)=>{
    if(!req.body)
    {
        res.status(400).send({message:"Data to update cant be empty!"});
        return;
           
    }
    const newUserEmail=req.body.email;
    Userdb.exists({email:newUserEmail},function(err,result){
        if(result)
        {
            const id =req.params.id;
            req.flash('error_msg','Email is already in use');
            res.redirect(`/user/${id}`);
        }
        else
        {
            const newUser=req.body;
            bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;

            // Set Password to Hash
            newUser.password = hash;
            const id =req.params.id;
            Userdb.findByIdAndUpdate(id,newUser,{useFindAndModify:false})
            .then(data=>{
            if(!data)
            {
                res.status(404).send({message:`cannot update user ${id}`})
            }else{
                req.flash('success_msg','Details Updated Successfully');
                res.redirect(`/user/${id}`)
            }
        })
        .catch(err=>{
            res.status(500).send({message:"Error Update user information"})
        })
        });
    });
        }
    });     
});
   

// Get user index page
router.get("/:id", async(req, res) => {
	const parkings=await ParkingLocation.find({});
	res.render("../views/Customer_dash",{parkings:parkings,id:req.params.id});
});


//get request for review and ratings
router.get('/:id/:p_id/reviews',async(req,res)=>{
    const parking=await ParkingLocation.findById(req.params.p_id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    });
    res.render('../views/feedback',{parking,user_id:req.params.id});
})

//post request for review and ratings
router.post('/:id/:p_id/reviews',async(req,res)=>{
    const parking=await ParkingLocation.findById(req.params.p_id);
    const review=new Review(req.body.review);
    var totalratings=parking.reviews.length*parking.avgrating;
    var rating=Number(req.body.review.rating);
    totalratings=totalratings+rating; 
    review.author=req.params.id;
    parking.reviews.push(review);
    parking.avgrating=(totalratings/parking.reviews.length).toPrecision(2); 
    
    await review.save();
    await parking.save();
    req.flash('success_msg','Review Added Successfully');
    res.redirect(`/user/${req.params.id}/${req.params.p_id}/reviews`);
})
router.delete('/:id/:p_id/reviews/:reviewId', async (req, res) => {
    const { p_id, reviewId } = req.params;
    const parking=await ParkingLocation.findById(req.params.p_id);
    const review=await Review.findById(req.params.reviewId);
    var rating=Number(review.rating);
    var totalratings=parking.reviews.length*parking.avgrating;
    totalratings=totalratings-rating;
    if(parking.reviews.length!=1)
    {
        parking.avgrating=(totalratings/(parking.reviews.length-1)).toPrecision(2);
    }
    else{
        parking.avgrating=0;
    }
    await ParkingLocation.findByIdAndUpdate(p_id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    await parking.save();
    req.flash('success_msg','Review Deleted Successfully');
    res.redirect(`/user/${req.params.id}/${req.params.p_id}/reviews`);
})

////////search option
// Get user index page
router.post("/:id/search", async(req, res) => {
    let loc=req.body.place;
    loc=_.startCase(_.toLower(loc));
    if(loc=="")
    {
        const parkings=await ParkingLocation.find({});
	    res.render("../views/Customer_dash",{parkings:parkings,id:req.params.id});
    }
    else
    {
	    const parkings=await ParkingLocation.find({location:loc});
	    res.render("../views/Customer_dash",{parkings:parkings,id:req.params.id});
    }
});

function compare( a, b ) 
{
    if (a.avgrating < b.avgrating)
    {
      return 1;
    }
    if ( a.avgrating > b.avgrating )
    {
      return -1;
    }
    return 0;
  }

router.post("/:id/sort", async(req, res) => {
    let loc=req.body.place;
    loc=_.startCase(_.toLower(loc));
    let parkings;
    if(loc=="")
    {
        parkings=await ParkingLocation.find({});
    }
    else
    {
	    parkings=await ParkingLocation.find({location:loc});
    }
    parkings.sort( compare );
	res.render("../views/Customer_dash",{parkings:parkings,id:req.params.id});
});

module.exports = router;