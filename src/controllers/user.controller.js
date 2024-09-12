import  { asynchandler } from "../utils/asynchandler.js"
import { Apierror } from "../utils/Apierror.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { Jwt } from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId)=>{



    try {
      const   user =  await User.findById(userId)
    const accessToken = user.generateAccessToken()
     const refreshToken = user.generateRefreshToken()

     user.refreshToken = refreshToken
     await user.save({validateBeforeSave : false})

     return {accessToken, refreshToken}


    } catch (error) {
        throw new Apierror(500,"something went wrong while generating refresh and access token")
    }
}

const registerUser = asynchandler( async (req, res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username , email
    // check for images , check for avatar
    // upload them to cloudinary, avator
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    // ab destructure krr ha hu jo data ayega
    const {fullName, email, username, password} = req.body
    console.log("email: ",email);
    // if(fullName===""){
    //     throw new Apierror(400, "fullname is required")
    // }
    if([fullName,email,username,password].some((field)=>
        field?.trim()===""
    )){
        throw new Apierror(400,"All fields are mandatory")
    }

    const existedUser = await User.findOne(
        {
            $or : [{ username }, { email }]
        }
    )
    if (existedUser){
        throw new Apierror(409,"user with email or username already exist")
    }

  //  console.log(req.files);
   const avatarLocalPath = req.files?.avatar[0]?.path;
//    const coverImageLocalPath = req.files?.coverImage[0]?.path;

let coverImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0) {
    coverImageLocalPath = req.files.coverImage[0].path
}

   if(!avatarLocalPath){
    throw new Apierror(400,"Avatar file is required")
   }

const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath) 

if(!avatar){
    throw new Apierror(400,"Avatar file is required")
}

 const user = await User.create({
    fullName, 
    avatar : avatar.url,
    coverImage: coverImage?.url || "",
    email ,
    password,
    username: username.toLowerCase()

})

const createduser = await User.findById(user._id).select(
    "-password -refreshToken"
)
if(!createduser){
 throw new Apierror(500, "something went wrong while registering")
}

return res.status(201).json(
    new ApiResponse(200, createduser,"user created successfully")
)
    })  

const loginUser = asynchandler( async (req,res)=>{
    // req body -> data
    // username or email 
    // find the user
    // password check
    // access and refresh token
    // send cookie 

    const {email, username, password} = req.body
    if (!(username || email)){
         throw new Apierror(400, "username or email is required")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })
    if (!user){
        throw new Apierror(404, "user does not exist" )
    }
   const isPasswordValid = await user.isPasswordCorrect(password) 
    if (!isPasswordValid){
        throw new Apierror(401, "Invalid users credentials" )
   }
 const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

 const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

const options ={
    httpOnly: true,
    secure:true
}

return res
.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", refreshToken, options)
.json(
    new ApiResponse(
        200,
        {
            user: loggedInUser, accessToken,
            refreshToken
        },  
        "User logged in successfuly"

    )
)
})

const logoutUser = asynchandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken: undefined 

            }
        },
        {
            new:true
        }
    )
    
const options ={
    httpOnly: true,
    secure:true
}
return res
.status(200)
.clearCookie("accessToken",options)
.clearCookie("refreshToken", options)
.json(new ApiResponse(200, {}, "user logged out"))
})

const refreshAccessToken = asynchandler(async (req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new Apierror(401,"unauthorized token")
    } 
     
 try {
     const decodedToken =  Jwt.verify(
           incomingRefreshToken,
           process.env.REFRESH_TOKEN_SECRET// decrypted hoke aaya
       )
   
    const user = await   User.findById(decodedToken?._id)
   
    if(!user){
       throw new Apierror(401,"invalid refresh token")
    }
    if (incomingRefreshToken != user?.refreshToken) {
       throw new Apierror(401, "refresh token is expired or used")
    }
   
    const options = {
       httpOnly:true,
       secure:true
    }
   const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
   
    return res
    .status(200)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
       new ApiResponse(
           200,
           {
               accessToken, refreshToken : newRefreshToken},"Access token refreshed"
           
       )
   
    )
} catch (error) {
    throw new Apierror(401, error?.message || "Invalid refresh Token")
}
})

const changeCurrentPassword = asynchandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
   const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
    throw new Apierror(400, "Invalid old Password")
   }
   user.password = newPassword
   await user.save({validateBeforeSave : false})

   return res
   .status(200)
   .json(new ApiResponse(200,{},"Password changed successfully "))
})

const getCurrentUser = asynchandler(async(req,res)=>{

    return res
    .status(200)
    .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails = asynchandler(async(req,res)=>{
    const { fullName, email } = req.body

    if(!fullName|| !email){
        throw new Apierror(400,"All fields are required")
    }
  const user =  User.findByIdAndUpdate(req.user?.id,
    {
        $set: {
            fullName:fullName,
            email:email
        }
    }
  ,{new : true}).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"Account details uppdated successfully"))
})

const updateUserAvatar = asynchandler(async(req,res)=>
{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new Apierror(400,"avatar file is missing")
    }

    const avatar = await uploadOnCloudinary
    (avatarLocalPath)

    if(!avatar.url){
        throw new Apierror(400, " error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set:{
                avatar: avatar.url
            }
        },
        {new : true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"avatar image updated successfully")
    )


})
const updateUserCoverImage = asynchandler(async(req,res)=>
{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new Apierror(400,"cover image file is missing")
    }

    const coverImage= await uploadOnCloudinary
    (coverImageLocalPath)

    if(!coverImage.url){
        throw new Apierror(400, " error while uploading coverImage")
    }

   const user =  await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover image updated successfully")
    )


})
export  {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
} 