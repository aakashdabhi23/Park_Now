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
const BookedSlots=require('../models/BookedSlot');
const mongoose=require("mongoose");
const nodemailer = require('nodemailer');
const hbs=require('nodemailer-handlebars');
const url = require('url');   
const moment= require('moment-timezone'); 

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
    req.flash('success_msg','Review created Successfully');
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

//search option
// Get user index page
router.post("/:id/search", async(req, res) => {
    let loc=req.body.place;
    if(loc=="")
    {
        const parkings=await ParkingLocation.find({});
	    res.render("../views/Customer_dash",{parkings:parkings,id:req.params.id});
    }
    else
    {
	    const parkings=await ParkingLocation.find({$or:[{location:new RegExp(loc, 'i')},{landmark1:new RegExp(loc, 'i')},{landmark2:new RegExp(loc, 'i')}]});
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
    let parkings;
    if(loc=="")
    {
        parkings=await ParkingLocation.find({});
    }
    else
    {
	    parkings=await ParkingLocation.find({$or:[{location:new RegExp(loc, 'i')},{landmark1:new RegExp(loc, 'i')},{landmark2:new RegExp(loc, 'i')}]});
    }
    parkings.sort( compare );
	res.render("../views/Customer_dash",{parkings:parkings,id:req.params.id});
});


//Booking Page
router.get('/:id/bookings',async(req,res)=> {
    let time=new Date();

    var bookings= await BookedSlots.find({"user":req.params.id});
    await Promise.all(bookings.map(async(booking)=> {
        var loc = await ParkingLocation.findById(booking.location);
        if(loc!=null)
        {
        booking.loc= loc.location;
        booking.title=loc.title;
        booking.starttime=String(booking.starttime);
        }
        return booking;
    }));
    res.render('../views/previousBooking',{bookings,user_id:req.params.id,time:time});
})




// Get request for date and time entry
router.get('/:id/:p_id',async(req,res)=>{
    res.render('../views/EnterBookingDetails',{parking_id:req.params.p_id,user_id:req.params.id});
})

// Post request for date and time entry
router.post('/:id/:p_id',async(req,res)=>{

    
    var newStartTime=req.body.starttime;   ///starttime of booking
    var startDate= req.body.startdate;     ///start date of booking
    var startDateString=String(req.body.startdate).slice(0,10);
    var startTime= req.body.starttime;
    var start_book= new Date(startDate+"T"+startTime);
    var jun = moment(start_book);
    newStartTime=start_book;
    var duration= req.body.dur;
    
    var newEndTime=new Date(start_book.getTime()+duration*3600000);

    var UndesiredSlots = await BookedSlots.find({"starttime": {"$lt": newEndTime},"endtime": {"$gt": newStartTime}, "location":req.params.p_id,"vehicletype":req.body.vtype})
        
    UndesiredSlots= UndesiredSlots.map((slot)=>{
        return slot.slotnumber;
    });
    var number,price;
    const vtype= req.body.vtype;
    const curslot = await ParkingLocation.findById(req.params.p_id);
    if(vtype==="two")
    {
        number=curslot.slot2w;
        if(duration<curslot.lbookinghr)
        {
            price=duration*curslot.price2w;
        }
        else
        {
            price=duration*curslot.price2w*curslot.newfactor;
        }    
    }
    else
    {
        number=curslot.slot4w;
        if(duration<curslot.lbookinghr)
        {
            price=duration*curslot.price4w;
        }
        else
        {
            price=duration*curslot.price4w*curslot.newfactor;
        }    
    }
    var slotno=-1;
    for(var i = 1; i <= number; i++) {
        if(UndesiredSlots.includes(i)) {
            continue;
        }
        else{
            slotno=i;
            break;
        }
    }

    var infoo=await Userdb.findById(req.params.id);

    if(slotno==-1)
    {
        req.flash('error_msg','Sorry,all slots are full for given date and time!');
        res.redirect(`/user/${req.params.id}/${req.params.p_id}`);
    }
    else{
        req.app.set('slotno',slotno);
        req.app.set('price',price);
        const Slots = {
            location:req.params.p_id,
            slotnumber:slotno,
            startdate:startDateString,
            starttime:newStartTime,
            endtime:newEndTime,
            duration:duration,
            vehiclenumber:req.body.vno,
            vehicletype:req.body.vtype,
            price,
            user:req.params.id,
            name:infoo.name,
            email:infoo.email,
            contact:infoo.contact,
            typee:1
        };
        req.app.set('Slots',Slots);
        req.flash('success_msg','Please complete your payment process!');
      res.redirect(`/user/${req.params.id}/${req.params.p_id}/payment`);
    }
        
})


router.post('/:id/:b_id/cancel',async(req,res)=>{
     
    BookedSlots.findByIdAndDelete(req.params.b_id, function (err, docs)
    {
    });
    id=req.params.id
    res.redirect(`/user/${id}/bookings`);
        
});


//Payment
router.get('/:id/:p_id/payment',async(req,res)=> {

    res.render('../views/payment',{slotno:req.app.get('slotno'),price:req.app.get('price'),id:req.params.id,p_id:req.params.p_id});
})

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASS
    }
});

router.post('/:id/:p_id/payment',async (req,res)=>{
    var Slots= req.app.get('Slots');
    var idUser=mongoose.Types.ObjectId(Slots.user);
    var idLoca=mongoose.Types.ObjectId(Slots.location);
    var user_detail = await Userdb.findById(idUser);
    var location_detail= await ParkingLocation.findById(idLoca);
    var email_content= await ejs.renderFile(path.join(__dirname, '..', 'views', 'invoice.ejs'),{starttime:Slots.starttime,endtime:Slots.endtime,vehicletype:Slots.vehicletype,vehiclenumber:Slots.vehiclenumber,slotnumber:Slots.slotnumber,price:Slots.price,user_name:user_detail.name,loc_title:location_detail.location,loc_name:location_detail.title});
    var mailOptions = {
        from: process.env.EMAIL_ID,
        to: user_detail.email,
        subject: 'Your Bill From Park Now',
        html: email_content
    };   
    
    transporter.sendMail(mailOptions, async function(error, info) {
        if (error) {
            console.log(error);
        } else {
            Slots= new BookedSlots(Slots);        
            await Slots.save();
            req.flash('success_msg','Slot Booked Successfully');
            res.redirect(`/user/${idUser}`);
            
        }
    });
});



module.exports = router;