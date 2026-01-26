import { StatusCodes } from "http-status-codes";
import { Response, Request } from "express";
import User from "../models/user.model";

export const getAllUsers = async( req:Request, res:Response)=>{
    try {
        const user = await User.find();
        const {search, role} = req.query;
        
        if(role){
            const filteredUsers = user.filter((usr)=> usr.role === role);
            return res.status(StatusCodes.OK).json({
                success:true,
                message:"Users fetched successfully",
                data:filteredUsers
            })
        }

        if(search && typeof search === "string"){
            if(!user || user.length === 0){
                return res.status(StatusCodes.NOT_FOUND).json({
                    success:false,
                    message:"No users found"
                })
            }

            const searchedUsers = user.filter((usr)=>
                usr.name.toLowerCase().includes(search.toLowerCase()) ||
                usr.email.toLowerCase().includes(search.toLowerCase())
            );

            return res.status(StatusCodes.OK).json({
                success:true,
                message:"Users fetched successfully",
                data:searchedUsers
            })
        }

        if(!user){
            return res.status(StatusCodes.NOT_FOUND).json({
                success:false,
                message:"No users found"
            })
        }

        return res.status(StatusCodes.OK).json({
            success:true,
            message:"Users fetched successfully",
            data:user
        })
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success:false,
            message:"Server error"
        })
    }

}

export const deleteUser = async( req:Request, res:Response)=>{
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if(!user){
            return res.status(StatusCodes.NOT_FOUND).json({
                success:false,
                message:"User not found"
            })
        }

        return res.status(StatusCodes.OK).json({
            success:true,
            message:"User deleted successfully"
        })
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success:false,
            message:"Server error"
        })
    }
}