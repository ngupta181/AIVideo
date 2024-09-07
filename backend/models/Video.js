const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const ScriptSchema = new Schema({
    title: { type: String, required: true },
    texts: [{ type: String, required: true }],
    queries: [{ type: String, required: true }],
    createdAt: { type: Date, default: Date.now }
});

// Video Schema to store video information
const VideoSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    filePath: { type: String },
    scripts: [ScriptSchema],
    mediaFiles: [{
        path: String,
        duration: Number
      }],
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', VideoSchema);