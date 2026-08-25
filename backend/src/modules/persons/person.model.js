import { mongoose } from '../../lib/mongoose.js';

const personSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    aliases: [String],
    role: String, // suspect | witness | victim | person_of_interest | associate
    dateOfBirth: String,
    nationality: String,
    notes: String,
    photoUrl: String,
    caseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true }],
    // Linkage only. Face embeddings live inside InsightFace Server.
    faceCollectionPersonId: String,
    fingerprintTemplateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FingerprintTemplate' }],
    // elementId of the matching :Person node so Mongo <-> Neo4j stay joinable.
    graphKey: { type: String, index: true },
  },
  { timestamps: true },
);

export const Person = mongoose.model('Person', personSchema);
