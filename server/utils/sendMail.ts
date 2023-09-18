import nodemailer, { Transporter } from 'nodemailer';
import path from 'path';
import ejs from 'ejs';

interface IMailOptions {
    email : string;
    template : string;
    subject : string;
    data : Record<string, any>;
}

async function sendMail({template, data, subject, email} : IMailOptions){
    const transporter : Transporter  =  nodemailer.createTransport({
        host : process.env.SMTP_HOST,
        port : parseInt(process.env.SMTP_PORT as string),
        service : process.env.SMTP_SERVICE,
        auth : {
         user : process.env.SMTP_MAIL,
         pass : process.env.SMTP_PASSWORD
        }
    });

    //? Get the path to the email template file
    const templatePath = path.join(__dirname, '..', 'mails', template)
    
    //? Render the email template with ejs
    const html = await ejs.renderFile(templatePath, data);

    const mailOptions = {
        from : process.env.SMTP_MAIL,
        to : email,
        subject,
        html
    }

    await transporter.sendMail(mailOptions)

}

export default sendMail;