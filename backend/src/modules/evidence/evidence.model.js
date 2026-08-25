import { mongoose } from '../../lib/mongoose.js';

export const PROCESSING_STATUS = ['queued', 'processing', 'completed', 'failed'];

const evidenceSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    filename: { type: String, required: true },
    type: { type: String, default: 'document' }, // document | image | audio | video | other
    storageUrl: String,
    mimeType: String,
    bytes: Number,
    sha256: { type: String, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },

    processingStatus: { type: String, enum: PROCESSING_STATUS, default: 'queued', index: true },
    processingStep: String, // human-readable current step, polled by the client
    processingError: String,

    textLength: Number,
    chunkCount: Number,
    // Chunked is not the same as searchable: without an embedding provider the text is
    // split but never written to Qdrant, and the report must not claim otherwise.
    indexed: { type: Boolean, default: false },
    aiSummary: String,
    extractedEntities: [
      {
        _id: false,
        name: String,
        // Braced deliberately: a bare `type: String` here is read by mongoose as this
        // subdocument's own type declaration, silently collapsing it to [String].
        type: { type: String },
        confidence: Number,
      },
    ],
  },
  { timestamps: true },
);

export const Evidence = mongoose.model('Evidence', evidenceSchema);
