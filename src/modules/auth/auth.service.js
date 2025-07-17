import { OAuth2Client } from "google-auth-library";
import { OTP } from "../../models/otp.model.js";
import { User } from "../../models/user.model.js";
import { signup } from "../../utils/email/html.js";
import { asyncHandler, compare, encryption, generateToken, hashing, messages, sendemail, verifyToken } from "../../utils/index.js";
import Randomstring from "randomstring";

let failedAttempts = {}; // Store failed attempts count per user
let bannedUsers = {};    // Store banned status for users

export const register = async (req, res, next) => {
    const { otp, email } = req.body;
    const otpExist = await OTP.findOne({ otp, email });

    // Check if the user is currently banned
    if (bannedUsers[email]) {
        return res.status(403).json({ message: "You are banned for 15 minutes." });
    }
    // Retrieve the current failed attempt count (default to 0)
    let failedAtt = failedAttempts[email] || 0;

    // If the OTP doesn't exist, increase the failed attempt count
    if (!otpExist) {
        failedAtt++;

        // Update the failed attempts count in memory
        failedAttempts[email] = failedAtt;

        // If the failed attempts reach 5, ban the user for 15 minutes
        if (failedAtt >= 5) {
            bannedUsers[email] = true;

            // Remove the user from the banned list after 15 minutes
            setTimeout(() => {
                delete bannedUsers[email]; // Lift ban after 15 minutes
                delete failedAttempts[email]; // Reset failed attempts after the ban
                console.log(`Ban lifted for ${email}`);
            }, 15 * 60 * 1000); // 15 minutes ban

            return res.status(403).json({ message: "You are banned for 15 minutes." });
        }

        console.log(`Failed attempts for ${email}: ${failedAtt}`);
        return next(new Error("OTP does not exist", { cause: 404 }));
    }

    // If OTP exists and is correct, reset failed attempts and process registration
    delete failedAttempts[email]; // Reset failed attempts upon successful OTP

    const { userName, password, phone } = req.body;
    const createdUser = await User.create({
        userName,
        email,
        password,
        isActivated: true,
        phone: encryption({ data: phone }),
    });

    const token = generateToken({
        payload: { id: createdUser._id },
        options: { expiresIn: "15y" },
    });

    const link = `http://localhost:3000/auth/activate-account/${token}`;

    // Send activation email
    const isSent = await sendemail({
        to: email,
        subject: `Verify your account, dear ${email}`,
        html: `<p>To verify your account, please click <a href="${link}">here</a></p>`,
    });

    if (!isSent) return next(new Error("Email not sent. Please try again.", { cause: 500 }));

    return res.status(200).json({ message: "User created successfully", data: createdUser });
};



export const login=asyncHandler(async(req,res,next)=>{
    const{email,password}=req.body

    const userExist=await User.findOne({email})

    if(!userExist){
        return next(new Error('user not exist',{cause:404}))
    }
const matched =compare({data:password,hashData:userExist.password})
if(!matched){
    return next(new Error('incorrect password',{cause:500}))
}
// if (!userExist.isConfirmed) {
//     return next(new Error('verify your emial',{cause:500}))
// }
if (userExist.isDeleted==true){
    await User.updateOne({_id:userExist._id},{isDeleted:false})
}
// const token =jwt.sign({email,id:userExist._id},process.env.SECRET_KEY);
const accessToken=generateToken({payload:{email,id:userExist._id},options:{expiresIn:"20d"}})
const refreshToken=generateToken({payload:{email,id:userExist._id},options:{expiresIn:"2h"}})


return res.status(200).json({
    message: "logged in succesfully",
    success:true,
    accessToken:accessToken,
    refreshToken:refreshToken,
})      
});

export const activateAccount=asyncHandler(async(req,res,next)=>{

   const{token}=req.params
   const{id,error}=verifyToken(token);
   if(error) return next(error);

   const user= await User.findByIdAndUpdate(id,{isConfirmed:true});
   if(!user) return next(new Error("user not found ",{cause:404}))
    
    return res
    .status(200)
    .json({success:true,message:"congratulation,plz login"});

    
});
export const refreshTok=async(req,res,next)=>{
    //get data from req
    const {refreshToken}=req.body;
    //verify token
    const result =verifyToken({token:refreshToken})
    if(result.error) return next(result.error)
     
       const accesstoken= generateToken({
            payload:{email:result.email,id:result.id},
            options:{expiresIn:"1h"},
        })
return res.status(200).json({success:true,accesstoken})
}

export const sendOtp=async(req,res,next)=>{
    const {email}=req.body
    //check existance
    const foundEm= await User.findOne({email:email})
    if(foundEm) return next(new Error(messages.user.alreadyExist))
 
        //generate otp
    const otp=Randomstring.generate({length:5,charset:"alphanumeric"});
    const savedotp=await OTP.create({email,otp})

 
    
    const isSent= await sendemail({ 
        to:email,
        html:signup(otp),
    })
    if(!isSent){
        return {message:"email not sent"}
    }
    return res.status(200).json({success:true,message:messages.otp.createdSuccessfully})
}
export const forgetpass=async(req,res,next)=>{
   const{email}=req.body
   //find email
   const user=await User.findOne({email})
   if(!user) return next(new Error(messages.user.notFound,{casue:404}))


   const otp=Randomstring.generate({length:5,charset:"alphanumeric"});
   const savedotp=await OTP.create({email,otp})
   
   const isSent= await sendemail({ 
       to:email,
       html:signup(otp),
       
   })
   return res.status(200).json({success:true,message:messages.otp.createdSuccessfully,savedotp})
}
export const reset=async(req,res,next)=>{

    const {email,otp,password,cPassword}=req.body
    const user=await User.findOne({email})
    if(!user) return next(new Error(messages.user.notFound,{casue:404}))

        const otpExist=await OTP.findOne({otp,email})
        if(!otpExist) return next(new Error(messages.otp.notFound,{cause:404}))

            user.password=password
            await user.save()

            return res.json({success:true,message:"try to login now"})

}

const verifyIdToken=async(idToken)=>{
    const client= new OAuth2Client();
   const ticket=await client.verifyIdToken({
        idToken,
        audience:process.env.CLIENT_ID
    })
  const payload=  ticket.getPayload();
  console.log(payload);
  return payload;
  
}
export const googleLogin =async(req,res,next)=>{
    const{idToken}=req.body;
const {email,name,profilePic}=await verifyIdToken(idToken)

let userExist=await User.findOne({email})
if(!userExist) {
   userExist=  await User.create({userName:name,email,profilePic,provider:"google"})
}
const accessToken=generateToken({payload:{email,id:userExist._id},options:{expiresIn:"20d"}})
const refreshToken=generateToken({payload:{email,id:userExist._id},options:{expiresIn:"2h"}})


return res.status(200).json({
    message: "logged in succesfully",
    success:true,
    accessToken:accessToken,
    refreshToken:refreshToken,
})

}