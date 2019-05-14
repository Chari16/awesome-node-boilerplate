import express from 'express'
import middlewares from './middlewares/global'
import dotenv from 'dotenv'
import config from './config'

import userRouter from './resources/user/user.router'
import authRouter from './resources/auth/auth.router'
import logger from './utils/logger'

export const app = express()

/**
 * Dotenv
 */
dotenv.config()

/**
 * Global middlewares
 */
app.use(middlewares)

/**
 * Passport
 *
 */
import './services/passport'

/**
 * Routers
 */
app.use('/auth', authRouter)

app.use('/api/users', userRouter)

/**
 * Error Handler
 */
app.use((err, req, res, next) => {
	logger.info(err.message)
	res.json({error: err.message})
})

/**
 * Start Express server
 */
const {port} = config

export const start = () => {
	try {
		app.listen(port, () => {
			logger.info(`REST API on port ${port}`)
		})
	} catch (e) {
		logger.error(e.message)
	}
}
