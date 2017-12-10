import ErrorCode from '../errorCode';
import { TTTSError } from './ttts';

/**
 * ForbiddenError
 *
 * @class ForbiddenError
 * @extends {TTTSError}
 */
export default class ForbiddenError extends TTTSError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            message = 'Forbidden.';
        }

        super(ErrorCode.Forbidden, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
