import { StatusCodes } from "http-status-codes";
import { Response, Request } from "express";
import User from "../models/user.model";
import Vendor from "../models/vendor.model";
import sendEmail from "../services/mail.service";

//get users(learner,vendor) by filtering        
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

//suspend user
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

//approve vendor
export const approveVendor = async( req:Request, res:Response)=>{
    try {
        const vendorId = req.params.id;
        if (!vendorId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Vendor ID required"
            });
        }

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        if (vendor.approved) {
            return res.status(400).json({
                success: false,
                message: "Vendor already approved"
            });
        }

        vendor.approved = true;
        await vendor.save();

        
        return res.status(StatusCodes.OK).json({
            success:true,
            message:"Vendor approved successfully",
            data:vendor
        });

    } catch (error) {
        console.error('Approve vendor error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success:false,
            message:"Server error"
        })
    }
}

//send email to vendor when approved
export const notifyVendorApprova = async(req:Request, res:Response)=>{
    try {
        
    } catch (error) {
        console.error('Notify vendor approval error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success:false,
            message:"Server error"
        })
    }
}