import { graphql, GraphQLBoolean, GraphQLObjectType, GraphQLString } from "graphql";
import { attachmentType } from "../../../utils/attachment.js";

export const UserType=new GraphQLObjectType({
    name:"user",
    fields:{
                email:{type:GraphQLString},
                password:{type:GraphQLString},
                userName:{type:GraphQLString},
                phone:{type:GraphQLString},
                gender:{type:GraphQLString},
                role:{type:GraphQLString},
                isDeleted:{type:GraphQLBoolean},
                profilePic:{type:attachmentType},
                otp:{type:GraphQLString},
                isConfirmed:{type:GraphQLBoolean},
                deletedAt:{type:GraphQLString},
                provider:{type:GraphQLString},
            },
    
});