import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * リソースオーナースキーマ
 */
const schema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true
        },
        memberOf: {
            membershipNumber: {
                type: String,
                required: true
            },
            programName: {
                type: String,
                required: true
            },
            username: {
                type: String,
                required: true
            }
        },
        password_salt: {
            type: String,
            required: true
        },
        password_hash: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        familyName: {
            type: String,
            required: true
        },
        givenName: {
            type: String,
            required: true
        },
        email: String,
        telephone: String,
        description: String,
        notes: String,
        group: { // オーナー区分
            type: String,
            required: true
        }
    },
    {
        collection: 'owners',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

schema.index(
    {
        username: 1
    },
    {
        unique: true
    }
);

export default mongoose.model('Owner', schema);
