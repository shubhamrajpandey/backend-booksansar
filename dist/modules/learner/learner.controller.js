"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTopinfo = exports.addLearner = exports.getlearner = void 0;
const http_status_codes_1 = require("http-status-codes");
const learner_model_1 = __importDefault(require("./learner.model"));
const getlearner = async (req, res) => {
    try {
        const info = await learner_model_1.default.find();
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Top info get successfully",
            data: info,
        });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getlearner = getlearner;
const addLearner = async (req, res) => {
    try {
        const { topinfo, requestBook, email, phoneNumber, des, rate, uploadFile } = req.body;
        const info = await learner_model_1.default.create({
            topinfo,
            requestBook,
            email,
            phoneNumber,
            des,
            rate,
            uploadFile,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Successfully send",
            data: info,
        });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.addLearner = addLearner;
const UpdateTopinfo = async (req, res) => {
    try {
        const info = await learner_model_1.default.findById(req.params.id);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Top info update successfully",
            data: info,
        });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.UpdateTopinfo = UpdateTopinfo;
