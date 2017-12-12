import ErrorCode from '../errorCode';
import { TTTSError } from './ttts';

/**
 * NotImplementedError
 *
 * @class NotImplementedError
 * @extends {TTTSError}
 */
export default class NotImplementedError extends TTTSError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            message = 'Method is not yet implemented.';
        }

        super(ErrorCode.NotImplemented, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, NotImplementedError.prototype);
    }
}
