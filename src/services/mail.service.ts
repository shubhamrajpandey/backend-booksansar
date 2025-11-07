import nodemailer from "nodemailer";

import dotenv from "dotenv";

dotenv.config();


const transport = nodemailer.createTransport({
    service: "gmail",
    auth:{
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    }
})

const sendEmail = async (to:string,subject:string,text:string, html:string) => {
    try {
        const info = await transport.sendMail({
            from:   `"BookSansar" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            text,
            html: html || `<p>${text}</p>`
        })
        console.log("Email sent successfully:", info.messageId);
        return info;
    } catch (error) {
        console.error("Failed to send email:", error);
        throw new Error("Email sending failed");
    }
}

export default sendEmail;