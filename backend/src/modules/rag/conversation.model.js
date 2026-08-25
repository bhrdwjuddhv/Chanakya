import { mongoose } from '../../lib/mongoose.js';

const conversationSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AiConversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    // Only ever populated from chunks that were actually retrieved for this answer.
    citations: [
      {
        _id: false,
        index: Number,
        evidenceId: String,
        sourceName: String,
        pageNumber: Number,
        chunkId: String,
        snippet: String,
        score: Number,
      },
    ],
    sufficiency: { type: String, enum: ['sufficient', 'partial', 'insufficient'] },
    relatedEntityKeys: [String],
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const AiConversation = mongoose.model('AiConversation', conversationSchema);
export const AiMessage = mongoose.model('AiMessage', messageSchema);
