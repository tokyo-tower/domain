import ErrorCode from '../errorCode';
import { TTTSError } from './ttts';

/**
 * UnauthorizedError
 *
 * @class UnauthorizedError
 * @extends {TTTSError}
 */
export default class UnauthorizedError extends TTTSError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            message = 'Unauthorized.';
        }

        super(ErrorCode.Unauthorized, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}
