const express = require("express");
const router = express.Router();
const passport = require("passport");
const ParkingLocation=require("../models/Location");
const bcrypt = require("bcryptjs");
const Owner=require("../models/Owners");
const BookedSlots=require('../models/BookedSlot');
const OtpDb=require('../models/Otp');
var Userdb=require('../models/Users');
const _=require("lodash");
const nodemailer = require('nodemailer');
const hbs=require('nodemailer-handlebars');
const mongoose=require("mongoose");
const ejs=require('ejs');
const path = require('path');
 
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken=process.env.MAPBOX_TOKEN;

const geocoder=mbxGeocoding({accessToken:mapBoxToken});

//get method to show new parking form
router.get('/:id/newParking',(req,res)=>{
    const id=req.params.id;
	res.render('parkings/new',{id});
})

// post request to save new parking
router.post('/:id',async(req,res)=>{
    const GeoData=await geocoder.forwardGeocode({
        query:req.body.parking.location,
        limit:1
    }).send()
    const parking =new ParkingLocation(req.body.parking);
    parking.geometry=GeoData.body.features[0].geometry;
    parking.owner=req.owner._id;
    parking.avgrating=0;
    parking.location= _.startCase(_.toLower( parking.location));
    parking.landmark1= _.startCase(_.toLower( parking.landmark1));
    parking.landmark2= _.startCase(_.toLower( parking.landmark2));
    await parking.save();
    req.flash('success_msg','New Parking Lot Added Successfully');
    res.redirect(`/owner/${req.owner._id}`);
})

// Get all parking of current owner
router.get('/:id',async(req,res)=>{
	const id=req.params.id
    const parkings=await ParkingLocation.find({owner:id});
    const owner=await Owner.findById(id);
    res.render('parkings/Owner_dash',{parkings,id,owner});
})

//update owner 
router.get('/:id/update-owner',(req,res)=>{
    const id=req.params.id;
    Owner.findById(id)
        .then(userdata=>{
            if(!userdata)
            {
                res.status(404).send({message:`not found user ${id}`})
            }
            else{
                res.render("update_owner",{user:userdata})
            }
        })
        .catch(err=>{
            res.send(err);
        })
})
router.post('/:id/update-owner',(req,res)=>{
    if(!req.body)
    {
        res.status(400).send({message:"Data to update cant be empty!"});
        return;
           
    }

    const newUserEmail=req.body.email;
    Owner.exists({email:newUserEmail},function(err,result){
        if(result)
        {
            const id =req.params.id;
            req.flash('error_msg','Email is already in use');
            res.redirect(`/owner/${id}`);
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
            Owner.findByIdAndUpdate(id,req.body,{useFindAndModify:false})
            .then(data=>{
            if(!data)
            {
                res.status(404).send({message:`cannot update user ${id}`})
            }else{
                req.flash('success_msg','Details Updated Successfully');
                res.redirect(`/owner/${id}`)
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


// Get parking details 
router.get('/:id/:p_id',async(req,res)=>{
    const parking=await ParkingLocation.findById(req.params.p_id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    });
	const id=req.params.id;
    const p_id=req.params.p_id;
    let today=new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    todayString=yyyy +'-'+ mm +'-'+ dd;
    const bookings= await BookedSlots.find({location: req.params.p_id, startdate:todayString});
    res.render('parkings/show',{parking,id,bookings,p_id});
});

///show history by date
router.post('/:id/:p_id/sortByDate',async(req,res)=>{
    const parking=await ParkingLocation.findById(req.params.p_id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    });
	const id=req.params.id;
    const p_id=req.params.p_id;
    let sortdate=String(req.body.date).slice(0,10);
    const bookings= await BookedSlots.find({location: req.params.p_id,startdate:sortdate});
    res.render('parkings/show',{parking,id,bookings,p_id});
});

router.post('/:id/:p_id/sales',async(req,res)=>{
    const parking=await ParkingLocation.findById(req.params.p_id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    });
    let price2=0,price4=0;
	const id=req.params.id;
    const p_id=req.params.p_id;
    let sortdate=String(req.body.date).slice(0,10);
    const bookings= await BookedSlots.find({location: req.params.p_id,startdate:sortdate});
    await Promise.all(bookings.map(async(booking)=> {
        if(booking.vehicletype=="two")
        {
            price2=price2+booking.price;

        }
        else
        {
            price4=price4+booking.price;
        }

    }));
    req.flash('success_msg',`The sales for 2 wheeler:Rs.${price2} and for 4 wheeler:Rs.${price4}`);
    res.render('parkings/show',{parking,id,bookings,p_id});
});


router.get('/:id/:p_id/delete',async(req,res)=>{
    ParkingLocation.findByIdAndDelete(req.params.p_id, function (err, docs)
    {
    });
    id=req.params.id
    res.redirect(`/owner/${id}`);

});

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASS
    }
});


//OTP
router.post('/:id/:p_id/OTP', async(req,res)=>{
    let idBooking=mongoose.Types.ObjectId(req.body.booking_id);
    let currBook=await BookedSlots.findById({_id:idBooking});  
    var otpno=Math.floor((Math.random()*1000000)+1);

    const currotp = new OtpDb({
        usremail:currBook.email,
        OTPno:otpno
    });
    await currotp.save();

    var email_content= `Your OTP Is:${otpno}`;
    var mailOptions = {
        from: process.env.EMAIL_ID,
        to: currBook.email,
        subject: 'Your OTP From Park Now',
        html: email_content
    };   

    transporter.sendMail(mailOptions, async function(error, info) {
        if (error) {
            console.log(error);
        } else {
            // console.log('Email sent: ' + info.response);
            req.flash('success_msg',"OTP Sent Successfully");
            res.redirect(`/owner/${req.params.id}/${req.params.p_id}`);  
            
        }
    });
})


//Confirm OTP
router.post('/:id/:p_id/release', async(req,res)=>{
    let idBooking=mongoose.Types.ObjectId(req.body.booking_id);
    let newendtime=new Date();
    let currBook=await BookedSlots.findById({_id:idBooking}); 
    let newstarttime=currBook.starttime;
    if(currBook.starttime>newendtime)
    {
        newstarttime=newendtime
    }

    let otpc = await OtpDb.findOne({$and:[{usremail:currBook.email},{OTPno:req.body.checkotp}]});

    if(otpc===null)
    {
        req.flash('error_msg',"Incorrect OTP");
        res.redirect(`/owner/${req.params.id}/${req.params.p_id}`); 
    }

    else {
    let otps=String(otpc.OTPno);

    if((otpc.usremail===currBook.email) && (otps===req.body.checkotp))
    {
        await OtpDb.findOneAndDelete({$and:[{usremail:currBook.email},{OTPno:req.body.checkotp}]});

        BookedSlots.findByIdAndUpdate(idBooking,{typee:0,endtime:newendtime,starttime:newstarttime},  function (err, docs) {
            if (err){
                console.log(err)
            }
            else{
                console.log("Successfully Updated");
            }
        });
        req.flash('success_msg',`${currBook.name} successfully exited`);
        res.redirect(`/owner/${req.params.id}/${req.params.p_id}`); 

    }

    else
    {
        req.flash('error_msg',"Incorrect OTP");
        res.redirect(`/owner/${req.params.id}/${req.params.p_id}`); 
    }
}

   
   
   
})

//Emergency Booking
router.get("/:id/:p_id/emergency", async(req, res) => {
	res.render("../views/EmergencyBooking",{user_id:req.params.id,p_id:req.params.p_id});
});

router.post("/:id/:p_id/emergency", async(req, res) => {

    var newStartTime=req.body.starttime;   ///starttime of booking
    var startDate= req.body.startdate;     ///start date of booking
    var startDateString=String(req.body.startdate).slice(0,10);
    var startTime= req.body.starttime;
    var start_book= new Date(startDate+"T"+startTime);
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
    
    if(slotno==-1)
    {
        req.flash('error_msg','Sorry,all slots are full for given date and time!');
        res.redirect(`/owner/${req.params.id}/${req.params.p_id}`); 
    }
    else{

        var location_detail= await ParkingLocation.findById(req.params.p_id);
        var email_content= await ejs.renderFile(path.join(__dirname, '..', 'views', 'invoice.ejs'),{starttime:newStartTime,endtime:newEndTime,vehicletype:req.body.vtype,vehiclenumber:req.body.vno,slotnumber:slotno,price:price,user_name:req.body.name,loc_title:location_detail.location,loc_name:location_detail.title});
        var mailOptions = {
            from:process.env.EMAIL_ID,
            to: req.body.email,
            subject: 'Your Bill From Park Now',
            html: email_content
        };   
        
        transporter.sendMail(mailOptions, async function(error, info) {
            if (error) {
                console.log(error);
            } 
            else {

            const Slots = new BookedSlots({
            location:req.params.p_id,
            slotnumber:slotno,
            startdate:startDateString,
            starttime:newStartTime,
            endtime:newEndTime,
            duration:duration,
            vehiclenumber:req.body.vno,
            vehicletype:req.body.vtype,
            price,
            name:req.body.name,
            email:req.body.email,
            contact:req.body.contact,
            typee:1
        });
        Slots.save();        
        req.flash('success_msg','Slot Booked Successfully');
        res.redirect(`/owner/${req.params.id}/${req.params.p_id}`); 
        } 
    });
    }
});
module.exports = router;