import  { asynchandler } from "../utils/asynchandler.js"
import { Apierror } from "../utils/Apierror.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiresponse.js";

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
    if (!username || !email){
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
export  {
    registerUser,
    loginUser,
    logoutUser
} 