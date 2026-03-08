"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSupportRequest = exports.updateSupportRequest = exports.getAllSupportRequests = exports.createSupportRequest = void 0;
const support_model_1 = __importDefault(require("./support.model"));
const mail_service_1 = __importDefault(require("../../services/mail.service"));
const emailWrapper = (heading, body) => `
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sedgwick+Ave&display=swap" rel="stylesheet">
<div style="font-family:'Inter', Arial, sans-serif; max-width:600px; margin:auto; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

  <div style="background-color:#321874; color:#ffffff; text-align:center; padding:24px 0;">
    <h1 style="margin:0; font-size:28px; font-family:'Sedgwick Ave', cursive; letter-spacing:1px;">
      <span style="color:#ffffff;">Book</span><span style="color:#E68A00;">Sansar</span>
    </h1>
    <p style="margin:6px 0 0; font-size:14px; color:#e0e0e0;">Your digital reading companion</p>
  </div>

  <div style="padding:32px 24px; color:#1f2937;">
    <h2 style="margin-bottom:16px; color:#321874; text-align:center;">${heading}</h2>
    ${body}
  </div>

  <div style="background-color:#f9fafb; text-align:center; padding:16px; font-size:13px; color:#9ca3af;">
    &copy; 2025 <span style="color:#321874; font-weight:600;">BookSansar</span>. All rights reserved.
  </div>
</div>
`;
const getConfirmationEmail = (type, name) => {
    const displayName = name || "there";
    const typeConfig = {
        contact: {
            subject: "We received your message – BookSansar",
            heading: "Message Received",
            body: `
        <p style="font-size:15px; line-height:1.6; color:#4b5563;">
          Dear <strong>${displayName}</strong>,
        </p>
        <p style="font-size:15px; line-height:1.6; color:#4b5563;">
          Thank you for reaching out! We've received your message and our team will get back to you within <strong>1 business day</strong>.
        </p>
        <div style="background-color:#f3f4f6; border-left:4px solid #321874; padding:14px 16px; border-radius:6px; margin:20px 0;">
          <p style="margin:0; font-size:14px; color:#4b5563;">
            If your query is urgent, you can also reach us at 
            <a href="mailto:hello.booksansar@gmail.com" style="color:#E68A00;">hello.booksansar@gmail.com</a>
          </p>
        </div>
      `,
        },
        feedback: {
            subject: "Thanks for your feedback – BookSansar",
            heading: "Feedback Received",
            body: `
        <p style="font-size:15px; line-height:1.6; color:#4b5563;">
          Dear <strong>${displayName}</strong>,
        </p>
        <p style="font-size:15px; line-height:1.6; color:#4b5563;">
          Thank you for sharing your feedback with us! We value your input and will review it shortly. If you reported an issue, our support team will contact you within <strong>24–48 hours</strong>.
        </p>
        <div style="background-color:#fff7ed; border-left:4px solid #E68A00; padding:14px 16px; border-radius:6px; margin:20px 0;">
          <p style="margin:0; font-size:14px; color:#4b5563;">
            Your feedback helps us improve BookSansar for everyone. We truly appreciate it!
          </p>
        </div>
      `,
        },
        book_request: {
            subject: "Book Request Received – BookSansar",
            heading: "Book Request Submitted",
            body: `
        <p style="font-size:15px; line-height:1.6; color:#4b5563;">
          Dear <strong>${displayName}</strong>,
        </p>
        <p style="font-size:15px; line-height:1.6; color:#4b5563;">
          We've received your book request! Our team will review it and do our best to make it available on the platform. We'll notify you once it's added.
        </p>
        <div style="background-color:#f0fdf4; border-left:4px solid #16a34a; padding:14px 16px; border-radius:6px; margin:20px 0;">
          <p style="margin:0; font-size:14px; color:#4b5563;">
            Keep exploring our library — we add new books regularly!
          </p>
        </div>
      `,
        },
        return_request: {
            subject: "Return Request Received – BookSansar",
            heading: "Return Request Submitted",
            body: `
        <p style="font-size:15px; line-height:1.6; color:#4b5563;">
          Dear <strong>${displayName}</strong>,
        </p>
        <p style="font-size:15px; line-height:1.6; color:#4b5563;">
          We've received your return request and our team will review it within <strong>1–2 business days</strong>. You'll receive an email once it's approved with further instructions.
        </p>
        <div style="background-color:#f3f4f6; border-left:4px solid #321874; padding:14px 16px; border-radius:6px; margin:20px 0;">
          <p style="margin:0; font-size:14px; color:#4b5563;">
            Please do <strong>not</strong> ship the item until you receive approval from our team.
          </p>
        </div>
      `,
        },
    };
    const config = typeConfig[type];
    return {
        subject: config.subject,
        html: emailWrapper(config.heading, config.body),
    };
};
const getAdminResolutionEmail = (name, id, status, adminNote) => {
    const displayName = name || "there";
    const isResolved = status === "resolved";
    const body = `
    <p style="font-size:15px; line-height:1.6; color:#4b5563;">
      Dear <strong>${displayName}</strong>,
    </p>
    <p style="font-size:15px; line-height:1.6; color:#4b5563;">
      Your request <strong>(#${id})</strong> has been 
      <strong style="color:${isResolved ? "#16a34a" : "#dc2626"};">
        ${status}
      </strong>.
    </p>

    ${adminNote
        ? `
    <div style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:20px 0;">
      <p style="margin:0 0 6px; font-size:13px; font-weight:600; color:#321874; text-transform:uppercase; letter-spacing:0.5px;">
        Note from our team
      </p>
      <p style="margin:0; font-size:14px; color:#4b5563; line-height:1.6;">
        ${adminNote}
      </p>
    </div>
    `
        : ""}

    ${isResolved
        ? `
    <div style="background-color:#f0fdf4; border-left:4px solid #16a34a; padding:14px 16px; border-radius:6px; margin:20px 0;">
      <p style="margin:0; font-size:14px; color:#4b5563;">
        If you have any further questions, feel free to contact us at 
        <a href="mailto:hello.booksansar@gmail.com" style="color:#E68A00;">hello.booksansar@gmail.com</a>
      </p>
    </div>
    `
        : `
    <div style="background-color:#fff1f2; border-left:4px solid #dc2626; padding:14px 16px; border-radius:6px; margin:20px 0;">
      <p style="margin:0; font-size:14px; color:#4b5563;">
        If you believe this decision was made in error, please contact our support team at 
        <a href="mailto:hello.booksansar@gmail.com" style="color:#E68A00;">hello.booksansar@gmail.com</a>
      </p>
    </div>
    `}
  `;
    return {
        subject: `Your BookSansar request has been ${status}`,
        html: emailWrapper(isResolved ? "Request Resolved ✓" : "Request Rejected", body),
    };
};
const createSupportRequest = async (req, res) => {
    try {
        const { type, email, name, files } = req.body;
        const allowed = ["feedback", "book_request", "contact", "return_request"];
        if (!allowed.includes(type)) {
            return res.status(400).json({ message: "Invalid support type" });
        }
        const support = await support_model_1.default.create({
            ...req.body,
            files: files || [],
        });
        const { subject, html } = getConfirmationEmail(type, name);
        await (0, mail_service_1.default)(email, subject, "", html);
        res.status(201).json({
            message: "Request submitted successfully",
            id: support._id,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
exports.createSupportRequest = createSupportRequest;
const getAllSupportRequests = async (req, res) => {
    try {
        const { type, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (type)
            filter.type = type;
        if (status)
            filter.status = status;
        const [items, total] = await Promise.all([
            support_model_1.default.find(filter)
                .sort({ createdAt: -1 })
                .skip((+page - 1) * +limit)
                .limit(+limit),
            support_model_1.default.countDocuments(filter),
        ]);
        res.json({
            items,
            total,
            page: +page,
            pages: Math.ceil(total / +limit),
        });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.getAllSupportRequests = getAllSupportRequests;
const updateSupportRequest = async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const update = { status, adminNote };
        if (status === "resolved")
            update.resolvedAt = new Date();
        const support = await support_model_1.default.findByIdAndUpdate(req.params.id, update, {
            new: true,
        });
        if (!support)
            return res.status(404).json({ message: "Not found" });
        if (status === "resolved" || status === "rejected") {
            const { subject, html } = getAdminResolutionEmail(support.name || "", status, adminNote);
            await (0, mail_service_1.default)(support.email, subject, "", html);
        }
        res.json({ message: "Updated", support });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateSupportRequest = updateSupportRequest;
const deleteSupportRequest = async (req, res) => {
    try {
        await support_model_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteSupportRequest = deleteSupportRequest;
