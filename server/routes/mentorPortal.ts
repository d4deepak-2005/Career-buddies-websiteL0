import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Candidate } from '../models/Candidate.ts';
import { CandidateItem } from '../models/CandidateItem.ts';
import { Mentor } from '../models/Mentor.ts';
import { requireCandidateAuth } from '../middleware/candidateAuth.ts';

// ---------------------------------------------------------------------------
// Mentor Portal API, mounted at /api/mentor. The mentor is ALWAYS the session's account
// (requireCandidateAuth); no mentor id is ever read from the request. Sessions are the
// CandidateItem records an admin assigned to this mentor (mentorId), and the candidates
// are the people on those sessions.
// ---------------------------------------------------------------------------
export const mentorPortalRouter = express.Router();

function requireMentor(req: Request, res: Response, next: NextFunction) {
  if ((req as any).candidate?.accountType !== 'mentor') {
    return void res.status(403).json({ success: false, error: 'The Mentor Portal is only for mentor accounts.' });
  }
  next();
}

mentorPortalRouter.use(requireCandidateAuth, requireMentor);

const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

const DEFAULT_AVAILABILITY = (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const).map((day) => ({
  day,
  enabled: false,
  start: '18:00',
  end: '21:00',
}));

mentorPortalRouter.get('/portal', async (req: Request, res: Response) => {
  try {
    const me = (req as any).candidate;
    const sessions = (await CandidateItem.find({ kind: 'session', mentorId: me._id })
      .sort({ startsAt: 1 })
      .limit(1000)
      .lean()) as any[];

    const candidateIds = [...new Set(sessions.map((s) => String(s.candidateId)).filter(isId))];
    const people = (await Candidate.find({ _id: { $in: candidateIds } })
      .select('firstName lastName email mobile currentDesignation totalExperience targetRole linkedinUrl bio')
      .lean()) as any[];
    const personById = new Map(people.map((p) => [String(p._id), p]));

    // The public Mentor CMS record (same email) supplies the title and expertise shown on the profile.
    const cms = (await Mentor.findOne({ email: me.email }).select('designation expertise').lean()) as any;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const isCompleted = (s: any) => s.sessionStatus === 'completed';
    const isUpcoming = (s: any) => s.sessionStatus === 'scheduled' && new Date(s.startsAt).getTime() >= now.getTime();

    const candidates = candidateIds
      .map((id) => personById.get(id))
      .filter(Boolean)
      .map((p) => ({
        id: String(p._id),
        name: [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.email,
        email: p.email,
        phone: p.mobile || undefined,
        currentRole: p.currentDesignation || '',
        experience: p.totalExperience || '',
        targetRole: p.targetRole || '',
        resumeAvailable: false,
        linkedinUrl: p.linkedinUrl || undefined,
        summary: p.bio || undefined,
      }));

    const mentorSessions = sessions.map((s) => ({
      id: String(s._id),
      candidateId: String(s.candidateId),
      sessionType: s.title || '',
      careerGoal: personById.get(String(s.candidateId))?.targetRole || '',
      startsAt: new Date(s.startsAt).toISOString(),
      durationMinutes: s.durationMinutes ?? 60,
      status: s.sessionStatus || 'scheduled',
      meetingUrl: s.url || undefined,
      brief: s.description || undefined,
      notes: s.mentorNotes || undefined,
      notesSubmitted: !!s.notesSubmitted,
    }));

    res.json({
      isSample: false,
      mentor: {
        name: [me.firstName, me.lastName].filter(Boolean).join(' ').trim() || me.email,
        title: cms?.designation || '',
        email: me.email,
        expertise: cms?.expertise || [],
      },
      summary: {
        totalSessionsConducted: sessions.filter(isCompleted).length,
        completedThisMonth: sessions.filter((s) => isCompleted(s) && new Date(s.startsAt) >= monthStart).length,
        upcomingSessions: sessions.filter(isUpcoming).length,
        assignedCandidates: candidates.length,
      },
      candidates,
      sessions: mentorSessions,
      // Availability is not stored yet, so every day starts unset.
      availability: DEFAULT_AVAILABILITY,
    });
  } catch (error) {
    console.error('[MentorPortal] load failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Could not load your mentor data.' });
  }
});

// POST /api/mentor/sessions/:id/notes  Body: { notes }
// Only the mentor assigned to the session can write its notes.
mentorPortalRouter.post('/sessions/:id/notes', async (req: Request, res: Response) => {
  try {
    const me = (req as any).candidate;
    if (!isId(req.params.id)) return void res.status(404).json({ success: false, error: 'Session not found.' });
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 4000) : '';
    if (!notes) return void res.status(400).json({ success: false, error: 'Write your session notes before submitting.' });

    const updated = await CandidateItem.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id), kind: 'session', mentorId: me._id },
      { $set: { mentorNotes: notes, notesSubmitted: true } }
    );
    if (!updated.matchedCount) return void res.status(404).json({ success: false, error: 'Session not found.' });
    res.json({ success: true, notes, notesSubmitted: true });
  } catch (error) {
    console.error('[MentorPortal] notes failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Could not save your notes. Please try again.' });
  }
});
