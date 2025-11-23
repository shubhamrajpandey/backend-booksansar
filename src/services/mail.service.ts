import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);


const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
) => {
  try {
    const msg = {
      to,
      from: {
        email: "shubhamrajpandey875@gmail.com", 
        name: "BookSansar",
      },
      replyTo: "hello.booksansar@gmail.com", 
      subject,
      text,
      html: html || `<p>${text}</p>`,
    };

    const response = await sgMail.send(msg);
    console.log("Email sent successfully to:", to);
    return response;
  } catch (error: unknown) {
    throw new Error("Email sending failed");
  }
};

export default sendEmail;
