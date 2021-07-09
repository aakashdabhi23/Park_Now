const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const bookedslotSchema = new Schema({
    location:{
        type:Schema.Types.ObjectId,
        ref:'location'
    },
    slotnumber:{
        type: Number,
        required: true
    },
    startdate:{
        type:String, 
        required: true
    },
    starttime:{
        type:Date, 
        required: true
    },
    endtime:{
        type:Date, 
        required: true
    },
    duration:{
        type:Number,
        required: true
    },
    vehiclenumber:{
        type:String,
        required: true
    },
    vehicletype: {
        type:String,
        required: true
    },
    price:{
        type: Number,
        required: true
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:'user'
    },
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true

    },
    contact:{
        type:String,
        required:true
    },
    typee:{
            type:Number,
            required: true
    }
})
const BookedSlot = mongoose.model("bookedslot",bookedslotSchema);

module.exports = BookedSlot;