const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const feedbackSchema=new Schema({
    name: {type: String, require:true},
    email: {type: String, require:true},
    desc: {type: String, require:true},
})

module.exports=mongoose.model('Feedback',feedbackSchema);