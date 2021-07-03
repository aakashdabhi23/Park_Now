const express = require("express");
const router = express.Router();
const passport = require("passport");
const ParkingLocation=require("../models/Location");
const bcrypt = require("bcryptjs");
const Owner=require("../models/Owners");
var Userdb=require('../models/Users');
const _=require("lodash");
 
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken=process.env.MAPBOX_TOKEN;

const geocoder=mbxGeocoding({accessToken:mapBoxToken});


async function registration(category, email) 
{
	if (category === "user") 
	{
		return User.findOne({ email: email });
	} 
	else 
	{
		return Owner.findOne({ email: email });
	}
}

//get method to show new parking form
router.get('/:id/newParking',(req,res)=>{
    const id=req.params.id;
	res.render('parkings/new',{id});
})

// post request to save new parking
router.post('/:id',async(req,res)=>{
    //console.log(req.body);
    const GeoData=await geocoder.forwardGeocode({
        query:req.body.parking.location,
        limit:1
    }).send()
    const parking =new ParkingLocation(req.body.parking);
    parking.geometry=GeoData.body.features[0].geometry;
    parking.owner=req.owner._id;
    parking.avgrating=0;
    parking.location= _.startCase(_.toLower( parking.location));
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
    res.render('parkings/show',{parking,id});
});

router.get('/:id/:p_id/delete',async(req,res)=>{
    ParkingLocation.findByIdAndDelete(req.params.p_id, function (err, docs)
    {
    });
    id=req.params.id
    res.redirect(`/owner/${id}`);
});

module.exports = router;
