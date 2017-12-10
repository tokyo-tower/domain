import ErrorCode from '../errorCode';
import { TTTSError } from './ttts';

/**
 * RateLimitExceededError
 * @class RateLimitExceededError
 * @extends {TTTSError}
 */
export default class RateLimitExceededError extends TTTSError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            message = 'Rate limit exceeded.';
        }

        super(ErrorCode.RateLimitExceeded, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, RateLimitExceededError.prototype);
    }
}
