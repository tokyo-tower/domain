import mongoose = require('mongoose');

/**
 * 採番スキーマ
 */
let Schema = new mongoose.Schema({
    no: Number,
    target: String
},{
    collection: 'sequences'
});

export default Schema;