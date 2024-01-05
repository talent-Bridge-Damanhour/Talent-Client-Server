const nodemailer = require('nodemailer');
const User = require('../models/userModel')
const CustomError = require('../errors/index')
const { StatusCodes } = require('http-status-codes')
const dotenv = require("dotenv");
const winston = require('winston');
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log' })
    ]
})

dotenv.config();



const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
    }
})

async function sendVerificationEmail(user) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { verificationCode: verificationCode },
            { new: true }
        );
    
        const mailOptions = {
            from: process.env.EMAIL,
            to: updatedUser.email,
            subject: 'Account Verification',
            text: `Your verification code is: ${verificationCode}`
        };
    
        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent:', info.response);
    
        return updatedUser;
    } catch (error) {
        throw error;
    }
}

const verify = async (req, res) => {
    const { verificationCode } = req.body;
    const email = req.session.email; // Retrieve the email from the session

    console.log('Request Body:', req.body); // Log the entire request body

    console.log('Email:', email);
    console.log('Verification Code:', verificationCode);

    try {
        const user = await User.findOneAndUpdate(
            { email, verificationCode},
            { $unset: { verificationCode: 1 }, isVerified: true },
            { new: true }
        )

        console.log('findOneAndUpdate Result:', user);

        if(!user){
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid verification code' });
        }

        // Clear the email from the session
        delete req.session.email;

        logger.info('Verification success');
        res.json({ message: 'Email verification successful. User now has access.' });
    } catch (error) {
        logger.error('Error during email verification:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error during email verification' })
    }
}


module.exports = {
    verify,
    sendVerificationEmail
};