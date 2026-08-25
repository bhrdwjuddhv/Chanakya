import { mongoose } from '../../lib/mongoose.js';

const osintFindingSchema = new mongoose.Schema(
  {
    searchId: { type: String, index: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
    query: String,
    kind: String,

    source: String,      // connector id
    sourceName: String,  // human label
    sourceId: String,    // the record's id within that source
    title: String,
    recordKind: String,
    confidence: Number,
    attributes: mongoose.Schema.Types.Mixed,

    // What this record would contribute to the graph, with resolution against the case.
    // `type: { type: String }` is deliberate — a bare `type: String` inside a subdocument
    // is read by mongoose as the subdocument's own type declaration, collapsing it to a String.
    entities: [{ _id: false, type: { type: String }, name: String, resolution: String }],
    relationships: [{ _id: false, from: String, to: String, type: { type: String } }],
    note: String,

    // Open-source material is a lead until someone accepts it.
    status: { type: String, enum: ['new', 'accepted', 'dismissed'], default: 'new', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const OsintFinding = mongoose.model('OsintFinding', osintFindingSchema);
