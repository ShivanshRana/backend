import  { asynchandler } from "../utils/asynchandler.js"

const registerUser = asynchandler( async (req, res)=>{
    console.log('kk');
    
    res.status(200).json({
        message:"ok"
    })  
})

export  {
    registerUser
} 