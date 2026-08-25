import { mongoose } from '../../lib/mongoose.js';

const forensicArtifactSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
    filename: { type: String, required: true },
    storageUrl: String,
    bytes: Number,
    declaredMimeType: String,

    // Hashes are the point of a forensic record — three, so they cross-check.
    sha256: { type: String, required: true, index: true },
    sha1: String,
    md5: String,

    // What the bytes actually are, versus what the extension claims.
    detectedType: String,
    detectedMimeType: String,
    classification: String, // image | document | archive | executable | data | unknown
    extensionMismatch: { type: Boolean, default: false },

    metadata: mongoose.Schema.Types.Mixed, // EXIF / image properties / text stats
    gps: { lat: Number, lng: Number },

    indicators: [
      {
        _id: false,
        kind: String, // ipv4 | email | url | domain | phone | btc | hash | filepath
        value: String,
        count: Number,
      },
    ],

    aiSummary: String,
    entitiesAdded: { type: Number, default: 0 },
    analysedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const ForensicArtifact = mongoose.model('ForensicArtifact', forensicArtifactSchema);
