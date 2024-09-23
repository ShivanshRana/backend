import mongoose, {Schema} from "mongoose";
import { Apierror } from "../utils/Apierror";
import { asynchandler } from "../utils/asynchandler";
import { User } from "./user.model";

const subscriptionSchema = new Schema({

    subscriber:{
        type : Schema.Types.ObjectId,// one who is subscribing
        ref:"User"
    },
    channel: {
        type : Schema.Types.ObjectId,// one to whom is subscriber issubscribing
        ref:"User"

    }
},{timestamps:true })




export const Subscription = mongoose.model("Subscription",subscriptionSchema)
