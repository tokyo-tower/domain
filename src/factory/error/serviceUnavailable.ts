import ErrorCode from '../errorCode';
import { TTTSError } from './ttts';

/**
 * ServiceUnavailableError
 *
 * @class ServiceUnavailableError
 * @extends {TTTSError}
 */
export default class ServiceUnavailableError extends TTTSError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            message = 'Service unavailable temporarily.';
        }

        super(ErrorCode.ServiceUnavailable, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }
}
