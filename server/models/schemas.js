const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    id: { type: Number, unique: true }, // For backward compatibility with JSON IDs
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    emailConfig: {
        smtp: {
            host: { type: String, default: '' },
            port: { type: Number, default: 465 },
            user: { type: String, default: '' },
            pass: { type: String, default: '' }
        },
        imap: {
            host: { type: String, default: '' },
            port: { type: Number, default: 993 },
            user: { type: String, default: '' },
            pass: { type: String, default: '' }
        }
    }
}, { id: false });

const KnowledgeBaseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.Mixed, required: true }, // Mixed to handle both old Number IDs and new ObjectIDs
    keyword: { type: String, required: true },
    details: { type: String, required: true }
});

const AuthorizedStudentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    email: { type: String, required: true }
});

const DraftSchema = new mongoose.Schema({
    id: { type: Number, unique: true }, // manual timestamp ID
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    sender: { type: String, required: true },
    teacherEmail: { type: String },
    originalBody: { type: String },
    replyContent: { type: String },
    isArticleRequest: { type: Boolean, default: false },
    articleQuery: { type: String },
    attachments: [{
        filename: String,
        path: String
    }],
    status: { type: String, default: 'pending' },
    timestamp: { type: Date, default: Date.now }
}, { id: false });


const User = mongoose.model('User', UserSchema);
const KnowledgeBase = mongoose.model('KnowledgeBase', KnowledgeBaseSchema);
const AuthorizedStudent = mongoose.model('AuthorizedStudent', AuthorizedStudentSchema);
const Draft = mongoose.model('Draft', DraftSchema);

module.exports = { User, KnowledgeBase, AuthorizedStudent, Draft };
