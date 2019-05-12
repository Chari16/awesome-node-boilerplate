import crypto from 'crypto'
import {newToken} from '../../utils/auth'
import {createUser, findUserWithEmail, saveUser} from '../../mockDB/db'
import logger from '../../utils/logger'

/**
 * Sign up new user
 */
export const signup = (req, res, next) => {
	logger.debug('Sign up with: %o', req.body)

	const {email, password} = req.body
	if (!email || !password) {
		return res.status(400).send({message: 'need email and password'})
	}

	createUser(req.body)
		.then(user => {
			const token = newToken(user)
			return res.status(201).send({token})
		})
		.catch(next)
}

/**
 * Sign in user
 */
export const signin = (req, res, next) => {
	logger.debug('Sign in with: %o', req.body)

	const {email, password} = req.body

	if (!email || !password) {
		return res.status(400).send({message: 'need email and password'})
	}

	// Check password
	findUserWithEmail(email)
		.then(user => {
			if (user.password === password) {
				const token = newToken(user)
				return res.status(200).send({token})
			} else {
				return res.status(401).send({message: 'Fail to login'})
			}
		})
		.catch(next)
}

/**
 * Forget password
 * Save a reset password token and reset password expire to user model
 * Send user a link that has the reset password token
 *
 */
export const forgetPassword = async (req, res, next) => {
	// Check if email that user submitted belongs to an user
	const {email} = req.body
	try {
		let user = await findUserWithEmail(email)
		if (!user) {
			return res
				.status(404)
				.send({message: 'Could not find an user with provided email'})
		}
		// Create reset password token
		const resetPasswordToken = crypto.randomBytes(20).toString('hex')
		// Set expired time to be 1 hour
		const resetPasswordExp = Date.now() + 3600000
		// Save them to user object
		user.resetPasswordToken = resetPasswordToken
		user.resetPasswordExp = resetPasswordExp
		// Save user to the database
		try {
			await saveUser(user)
			// Create reset password url
			const resetUrl = `${req.headers.host}/password/reset/${
				user.resetPasswordToken
			}`
			// Send it to user
			return res.status(201).send({link: resetUrl})
		} catch (error) {
			next(error)
		}
	} catch (error) {
		next(error)
	}
}
