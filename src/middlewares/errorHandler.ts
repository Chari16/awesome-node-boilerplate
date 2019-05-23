import {ApiError} from '../utils/apiError'
import {ErrorRequestHandler, RequestHandler} from 'express'
import httpStatus from 'http-status'
import createLogger from '../utils/logger'
import {ErrorFormatter, validationResult} from 'express-validator/check'
import apiError from '../utils/apiError'

const logger = createLogger(module)

interface ErrorResponse {
	status: number
	errorCode: number
	message: string
}

/**
 * Middleware to parse Error
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
const parseError: ErrorRequestHandler = (err, req, res, next) => {
	if (!(err instanceof ApiError)) {
		const apiError = new ApiError(
			err.message || err.msg,
			err.status || httpStatus.INTERNAL_SERVER_ERROR,
		)
		return next(apiError)
	}

	return next(err)
}

/**
 * Middleware to send Error
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
const sendError: ErrorRequestHandler = (err, req, res, next) => {
	const {errorCode, message, status} = err

	if (status === httpStatus.INTERNAL_SERVER_ERROR) {
		logger.error(`[ERROR]: ${message}`)
	} else {
		logger.debug(`[ERROR]: ${message}`)
	}

	const errorResponse: ErrorResponse = {
		status,
		errorCode,
		message,
	}

	res.status(status).json(errorResponse)
}

export const errorHandler = [parseError, sendError]

/**
 * Middleware to return validation createError from express-validator
 *
 * @param req
 * @param res
 * @param next
 */
export const returnValidationError: RequestHandler = (req, res, next) => {
	const errors = validationResult(req)

	const errorFormatter: ErrorFormatter<string> = ({msg}) => {
		return msg
	}

	if (!errors.isEmpty()) {
		const errorMessage = errors.formatWith(errorFormatter).array()[0] as string

		return next(apiError.badRequest(errorMessage))
	}

	next()
}
