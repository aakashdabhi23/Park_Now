const { request } = require("express");
const express = require("express");
const router = express.Router();
const passport = require("passport");
var Userdb=require('../models/Users');
const bcrypt = require("bcryptjs");
const fs = require('fs');
const path = require('path');
const ejs=require('ejs');


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
	res.render("../views/Customer_dash",{id:req.params.id});
});

module.exports = router;