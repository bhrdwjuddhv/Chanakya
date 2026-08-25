import { mongoose } from '../../lib/mongoose.js';

/**
 * Face embeddings live inside InsightFace Server's own store. We keep only the linkage,
 * so there is one place that holds biometric vectors and it isn't this database.
 */
const faceEnrollmentSchema = new mongoose.Schema(
  {
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    insightfacePersonId: { type: String, required: true },
    // not `collection` — that is a reserved mongoose document path.
    collectionId: { type: String, required: true },
    sampleCount: { type: Number, default: 0 },
    enrolledAt: { type: Date, default: Date.now },
    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

/** Templates are AES-256-GCM encrypted at rest. Raw templates never leave the server. */
const fingerprintTemplateSchema = new mongoose.Schema(
  {
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    finger: { type: String, default: 'unknown' },
    templateEnc: { type: String, required: true },
    format: { type: String, enum: ['sourceafis', 'iso19794-2'], default: 'sourceafis' },
    quality: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

fingerprintTemplateSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.templateEnc;
    return ret;
  },
});

/**
 * One row per candidate returned by a real search. reviewStatus starts 'pending' —
 * a similarity score is never an identification until a person says so.
 */
const biometricMatchSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
    kind: { type: String, enum: ['face', 'fingerprint'], required: true },
    searchId: { type: String, index: true }, // groups the candidates of one search
    probeEvidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' },
    probeImageUrl: String,
    candidatePersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
    score: { type: Number, required: true },
    rank: Number,
    engine: String,
    reviewStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'uncertain'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNote: String,
  },
  { timestamps: true },
);

export const FaceEnrollment = mongoose.model('FaceEnrollment', faceEnrollmentSchema);
export const FingerprintTemplate = mongoose.model('FingerprintTemplate', fingerprintTemplateSchema);
export const BiometricMatch = mongoose.model('BiometricMatch', biometricMatchSchema);
