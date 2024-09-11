import { Apierror } from "../utils/Apierror"
import { asynchandler } from "../utils/asynchandler"
import Jwt  from "jsonwebtoken"
import { User } from "../models/user.model"

export const verifyJWT = asynchandler(async(req, res, next)=> {

 try {
    const token =   req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
   
    if(!token){
       throw new Apierror(401, "unauthorized request")
    }
   
    const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
   
   const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
   
   if (!user){
       throw new Apierror(401,"invalid Access Token")
   }
   
   req.user = user;
   next() 
 } catch (error) {
     throw new Apierror(401,"invalid access token")
 }
})