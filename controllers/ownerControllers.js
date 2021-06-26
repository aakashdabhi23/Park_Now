const express = require("express");
const router = express.Router();
const passport = require("passport");
const bcrypt = require("bcryptjs");
const Owner=require("../models/Owners")
var Userdb=require('../models/Users');


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

router.get('/:id',async(req,res)=>{
	const id=req.params.id
    const owner=await Owner.findById(id);
    res.render('parkings/Owner_dash',{id});
})

module.exports = router;
