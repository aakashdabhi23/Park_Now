const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const otpSchema=new Schema({
    usremail: {type: String, require:true},
    OTPno: {type: Number, require:true},
})

module.exports=mongoose.model('OTP',otpSchema);