import ErrorCode from '../errorCode';

/**
 * TTTSError
 *
 * @class TTTSError
 * @extends {Error}
 */
export class TTTSError extends Error {
    public readonly reason: ErrorCode;

    constructor(code: ErrorCode, message?: string) {
        super(message);

        this.name = 'TTTSError';
        this.reason = code;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, TTTSError.prototype);
    }
}
