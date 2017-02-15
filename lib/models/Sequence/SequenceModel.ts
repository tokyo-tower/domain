import * as mongoose from 'mongoose';

/**
 * 採番スキーマ
 */
const schema = new mongoose.Schema({
    no: Number,
    target: String
},                                 {
    collection: 'sequences'
});

export default mongoose.model('Sequence', schema);