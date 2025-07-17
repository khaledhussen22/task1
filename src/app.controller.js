import cors from "cors";
import connectDB from "./db/connection.js";
import authRouter from "./modules/auth/auth.controller.js"
import userRouter from "./modules/user/user.controller.js"
import { globalError } from "./utils/errors/global.error.js";
import { notFound } from "./utils/errors/not-found.js";
import adminRouter from "./modules/admin/admin.controller.js"
import {rateLimit} from "express-rate-limit"
import { createHandler } from "graphql-http/lib/use/express";



const bootstrap=async (app,express)=>{
    // app.use(rateLimit({
    //     windowMs:3*60*1000,
    //     limit:5,
    //     message:"dont try to hack",
    //     statusCode:400,
    //     handler:(req,res,next,options)=>{
    //     return next (new Error(options.message,{cause:options.statusCode}))
    //     },
    //     legacyHeaders:true//it appears the xratelimit tries(how many)

    // }));
    //parse req from raw body only (raw json)
    app.use(express.json());
    app.use(cors("*"))
    
    await connectDB()

app.use("/auth",authRouter)
app.use("/user",userRouter)
app.use("/admin",adminRouter)

 
    app.all("*",notFound)
    app.use(globalError)

}
export default bootstrap;
