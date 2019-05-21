import crypto from 'crypto'
import passport from 'passport'
import {RequestHandler} from 'express'

import {newToken} from '../../utils/auth'
import {
	createUser,
	findUserWithEmail,
	saveUser,
	findUserWithToken,
} from '../../mockDB/db'
import {sendEmail} from '../../utils/mail'
import apiError from '../../utils/apiError'
import createLogger from '../../utils/logger'

const logger = createLogger(module)

/**
 * Sign up new user
 *
 * @param req
 * @param res
 * @param next
 */
export const signup: RequestHandler = (req, res, next) => {
	logger.debug('Sign up with: %o', req.body)

	createUser(req.body)
		.then(user => {
			const token = newToken(user)
			return res.json({token})
		})
		.catch(err => next(apiError.badRequest(err.message)))
}

/**
 * Sign in user
 *
 * @param req
 * @param res
 * @param next
 */
export const signin: RequestHandler = (req, res, next) => {
	logger.debug('Sign in with: %o', req.body)
	passport.authenticate('local', (error, user) => {
		if (error) {
			return next(error)
		}

		if (user) {
			const token = newToken(user)
			return res.json({token})
		}
	})(req, res, next)
}

/**
 * Forget password
 * Save a reset password token and reset password expire to user model
 * Send user a link that has the reset password token
 *
 */
export const forgetPassword: RequestHandler = async (req, res, next) => {
	// Check if email that user submitted belongs to an user
	const {email} = req.body
	try {
		let user = await findUserWithEmail(email)
		if (!user) {
			const message = 'Could not find an user with provided email'
			next(apiError.notFound(message))
			return
		}
		// Create reset password token
		const resetPasswordToken = crypto.randomBytes(20).toString('hex')
		// Set expired time to be 1 hour
		const resetPasswordExp = Date.now() + 3600000
		// Save them to user object
		user.resetPasswordToken = resetPasswordToken
		user.resetPasswordExp = resetPasswordExp
		// Save user to the database
		await saveUser(user)
		// Send an email to user, containing the reset password token
		const resetUrl = `${req.headers.host}/auth/password/reset/${
			user.resetPasswordToken
		}`

		const message = {
			from: process.env.MAIL_SENDER,
			to: user.email,
			subject: 'Reset password',
			text: `Please click this link to reset password ${resetUrl}`,
		}

		const callback = (error: any) => {
			if (error) {
				next(apiError.internalServer(error))
			}

			res.status(201).send({message: 'Please check your email'})
		}

		sendEmail(message, callback)
	} catch (error) {
		next(error)
	}
}

/**
 * Reset password
 * Verify reset password token from request param
 * Save new user password and clear reset password token & expire
 *
 */
export const resetPassword: RequestHandler = async (req, res, next) => {
	// Check if the token in req params match with an user in db
	const {resetToken} = req.params
	try {
		const user = await findUserWithToken(resetToken)
		logger.debug('User', user)
		if (!user) {
			const message = 'Cannot find user with provided token'
			next(apiError.notFound(message))
		}
		// Check if expire time is over
		const resetPasswordExp = user.resetPasswordExp
		if (Date.now() > resetPasswordExp) {
			const message = 'Token is already expired'
			next(apiError.notFound(message))
		}
		// Save new user passsword
		// and remove reset token and expired time
		const {password} = req.body
		user.password = password
		user.resetPasswordExp = null
		user.resetPasswordToken = null
		await saveUser(user)

		return res
			.status(200)
			.send({message: 'Password has been successfully resetted'})
	} catch (error) {
		next(apiError.notFound(error))
	}
}
