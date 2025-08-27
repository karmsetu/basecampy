import Mailgen from "mailgen";
import nodemailer from "nodemailer";

export type SendEmailOptionsType = {
  mailgenContent: Mailgen.Content;
  email: string;
  subject: string;
};

export const sendEmail = async (options: SendEmailOptionsType) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: { name: "task manager", link: "#" },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHTML = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASSWORD,
    },
  });

  const mail = {
    from: "mail.taskmanager@gmail.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error("email service failed", error);
  }
};

export const emailVerificationMailgenContent = (
  username: string,
  verificationURL: string,
) => {
  return {
    body: {
      name: username,
      intro: "Welcom to our app",
      action: {
        instructions: "to verify your email, please click on the button",
        button: {
          color: "#22BC",
          text: "verify email",
          link: verificationURL,
        },
      },

      outro: "need help, or have questions? go fuck yourself",
    },
  };
};

export const forgotPasswordMailgenContent = (
  username: string,
  passwordResetUrl: string,
) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account",
      action: {
        instructions:
          "To reset your password click on the following button or link",
        button: {
          color: "#22BC66",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};
