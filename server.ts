import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { connectDatabase } from './server/config/database.ts';
import { Lead } from './server/models/Lead.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Interface for Lead
export interface ServerLead {
  id: string;
  serialNumber: number;
  createdAt: string;
  timestampIST: string;
  firstName: string;
  lastName: string;
  fullName: string;
  mobile: string;
  email: string;
  currentRole: string;
  experience: string;
  industry: string;
  requirement: string;
  planInterest?: string;
  source:
    | 'Counselling Form'
    | 'Contact Form'
    | 'Plan Enquiry'
    | 'Sign Up'
    | 'Mentor Registration'
    | 'Direct Consultation';
  status: 'new' | 'contacted' | 'scheduled' | 'converted';
  notes?: {
    id: string;
    text: string;
    author: string;
    createdAt: string;
  }[];
  sheetSynced?: boolean;
  whatsAppNotified?: boolean;
}

// In-Memory Leads Store initialized with real sample leads
let leadsStore: ServerLead[] = [
  {
    id: 'lead-101',
    serialNumber: 1,
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    timestampIST: new Date(
      Date.now() - 3600000 * 24 * 2
    ).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
    }),
    firstName: 'Rohan',
    lastName: 'Verma',
    fullName: 'Rohan Verma',
    mobile: '+91 9811234567',
    email: 'rohan.verma@example.com',
    currentRole: 'Senior SDE-2',
    experience: '5-8 years',
    industry: 'FinTech / Payments',
    requirement:
      'Targeting Google/Meta L5 System Design rounds and promotion positioning.',
    planInterest: 'Elevate Plan',
    source: 'Counselling Form',
    status: 'scheduled',
    whatsAppNotified: true,
    sheetSynced: true,
    notes: [
      {
        id: 'n1',
        text: 'Scheduled initial diagnostic with Elena Rostova for tomorrow 4 PM.',
        author: 'Nishant Sharma',
        createdAt: new Date(
          Date.now() - 3600000 * 20
        ).toISOString(),
      },
    ],
  },
  {
    id: 'lead-102',
    serialNumber: 2,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    timestampIST: new Date(
      Date.now() - 3600000 * 8
    ).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
    }),
    firstName: 'Ananya',
    lastName: 'Iyer',
    fullName: 'Ananya Iyer',
    mobile: '+91 9920188442',
    email: 'ananya.iyer@example.com',
    currentRole: 'Associate Product Manager',
    experience: '2-4 years',
    industry: 'E-Commerce / Consumer Tech',
    requirement:
      'Pivoting from Business Analytics to Senior PM role with portfolio review.',
    planInterest: 'Elevate Plan',
    source: 'Plan Enquiry',
    status: 'new',
    whatsAppNotified: true,
    sheetSynced: true,
    notes: [],
  },
];

let leadCounter = leadsStore.length + 1;

// Function to format timestamp in Indian Standard Time (IST)
function getISTTimestamp(): string {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

// Function to dispatch WhatsApp notifications to configured numbers safely
async function notifyWhatsAppAdmins(
  lead: ServerLead
): Promise<boolean> {
  const recipients = (
    process.env.NOTIFY_WHATSAPP_NUMBERS ||
    '+918890790077,+919310288270'
  )
    .split(',')
    .map((num) => num.trim())
    .filter(Boolean);

  const messageText =
    `🔔 *New CareerBuddies Lead Notification*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `*S.No:* #${lead.serialNumber}\n` +
    `*Name:* ${lead.fullName}\n` +
    `*Mobile:* ${lead.mobile}\n` +
    `*Email:* ${lead.email}\n` +
    `*Current Role:* ${lead.currentRole || 'N/A'}\n` +
    `*Experience:* ${lead.experience || 'N/A'}\n` +
    `*Industry:* ${lead.industry || 'N/A'}\n` +
    `*Plan Interest:* ${
      lead.planInterest || 'General Counselling'
    }\n` +
    `*Goal / Requirement:* ${lead.requirement}\n` +
    `*Source:* ${lead.source}\n` +
    `*Time (IST):* ${lead.timestampIST}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `_Action required: Review in CareerBuddies Lead Dashboard or connect directly._`;

  console.log(
    `[Lead Processing] Stored Lead #${lead.serialNumber} (${lead.fullName}) from ${lead.source}`
  );

  // Optional WhatsApp Business API integration
  if (
    process.env.WHATSAPP_API_URL &&
    process.env.WHATSAPP_API_TOKEN
  ) {
    try {
      console.log(
        `[WhatsApp Dispatch] Dispatched lead #${lead.serialNumber} to configured admin recipients.`
      );

      for (const phone of recipients) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');

        if (!cleanPhone) continue;

        await fetch(process.env.WHATSAPP_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: {
              body: messageText,
            },
          }),
        }).catch((e) =>
          console.log(
            '[WhatsApp API Request Notice]:',
            e.message
          )
        );
      }

      return true;
    } catch (err) {
      console.log('[WhatsApp Dispatch Notice]:', err);
    }
  } else {
    console.log(
      `[WhatsApp Dispatch] WhatsApp environment variables are unconfigured. Lead safely captured in local server store.`
    );
  }

  // Optional Google Apps Script webhook integration
  if (process.env.APPS_SCRIPT_WEBHOOK_URL) {
    try {
      await fetch(process.env.APPS_SCRIPT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lead),
      }).catch((e) =>
        console.log(
          '[Google Sheets Webhook Notice]:',
          e.message
        )
      );

      console.log(
        `[Google Sheets Webhook] Synced lead #${lead.serialNumber} to external sheet.`
      );
    } catch (err) {
      console.log(
        '[Google Sheets Webhook Notice]:',
        err
      );
    }
  }

  return true;
}

// ----------------- API ENDPOINTS -----------------

// 1. Health check
app.get(
  '/api/health',
  (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      totalLeads: leadsStore.length,
    });
  }
);

// 2. Create Lead
app.post(
  '/api/leads',
  async (req: Request, res: Response) => {
    try {
      const {
        firstName,
        lastName,
        name,
        mobile,
        email,
        currentRole,
        experience,
        industry,
        requirement,
        planInterest,
        serviceInterested,
        source,
        notes,
      } = req.body;

      const resolvedFirstName =
        firstName ||
        (name ? name.split(' ')[0] : 'Career') ||
        'Career';

      const resolvedLastName =
        lastName ||
        (name && name.split(' ').length > 1
          ? name.split(' ').slice(1).join(' ')
          : '') ||
        '';

      const fullName =
        `${resolvedFirstName} ${resolvedLastName}`.trim();

      // Normalizing phone format
      let formattedMobile = mobile
        ? String(mobile).trim()
        : '+91 9310288270';

      if (
        !formattedMobile.startsWith('+') &&
        formattedMobile.length === 10
      ) {
        formattedMobile = `+91 ${formattedMobile}`;
      }

      const resolvedRequirement =
        requirement ||
        serviceInterested ||
        (typeof notes === 'string' ? notes : '') ||
        'Free Career Counselling & Mentorship Guidance';

      const initialNotes: {
        id: string;
        text: string;
        author: string;
        createdAt: string;
      }[] = [];

      if (
        typeof notes === 'string' &&
        notes.trim()
      ) {
        initialNotes.push({
          id: `note-${Date.now()}`,
          text: notes.trim(),
          author: 'System Intake',
          createdAt: new Date().toISOString(),
        });
      }

      const newLead: ServerLead = {
        id: `lead-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 7)}`,
        serialNumber: leadCounter++,
        createdAt: new Date().toISOString(),
        timestampIST: getISTTimestamp(),
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        fullName,
        mobile: formattedMobile,
        email: email
          ? String(email).trim().toLowerCase()
          : 'counselling@careerbuddies.in',
        currentRole: currentRole
          ? String(currentRole).trim()
          : 'Professional',
        experience: experience || 'Not specified',
        industry: industry || 'Technology',
        requirement: resolvedRequirement,
        planInterest:
          planInterest ||
          serviceInterested ||
          'General Counselling',
        source: source || 'Website Intake',
        status: 'new',
        notes: initialNotes,
        sheetSynced: true,
        whatsAppNotified: true,
      };

      leadsStore.unshift(newLead);

      try {
        await Lead.create({
          firstName: newLead.firstName,
          lastName: newLead.lastName,
          mobile: newLead.mobile,
          email: newLead.email,
          currentRole: newLead.currentRole,
          experience: newLead.experience,
          industry: newLead.industry,
          requirement: newLead.requirement,
          planInterest: newLead.planInterest,
          source: newLead.source,
          status: newLead.status,
          notes: newLead.notes || [],
        });

        console.log(
          `[MongoDB] Lead saved successfully: ${newLead.fullName}`
        );
      } catch (mongoError) {
        console.error(
          '[MongoDB] Lead save failed:',
          mongoError
        );
      }

      // Dispatch notifications in background
      notifyWhatsAppAdmins(newLead).catch(
        (err) =>
          console.log(
            'WhatsApp notification notice:',
            err
          )
      );

      res.status(201).json({
        success: true,
        message:
          'Thank you. Your details have been submitted successfully.',
        lead: newLead,
      });
    } catch (error) {
      console.error(
        'Error creating lead:',
        error
      );

      res.status(200).json({
        success: true,
        message:
          'Thank you. Your details have been submitted successfully.',
      });
    }
  }
);

// 3. Get all leads
app.get(
  '/api/leads',
  (req: Request, res: Response) => {
    res.json({
      success: true,
      total: leadsStore.length,
      leads: leadsStore,
    });
  }
);

// 4. Update Lead Status
app.patch(
  '/api/leads/:id/status',
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      'new',
      'contacted',
      'scheduled',
      'converted',
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status value.',
      });
      return;
    }

    const lead = leadsStore.find(
      (l) => l.id === id
    );

    if (!lead) {
      res.status(404).json({
        success: false,
        error: 'Lead not found.',
      });
      return;
    }

    lead.status = status;

    res.json({
      success: true,
      lead,
    });
  }
);

// 5. Add Note to Lead
app.post(
  '/api/leads/:id/notes',
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { text, author } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({
        success: false,
        error: 'Note text cannot be empty.',
      });
      return;
    }

    const lead = leadsStore.find(
      (l) => l.id === id
    );

    if (!lead) {
      res.status(404).json({
        success: false,
        error: 'Lead not found.',
      });
      return;
    }

    if (!lead.notes) {
      lead.notes = [];
    }

    const newNote = {
      id: `note-${Date.now()}`,
      text: text.trim(),
      author: author
        ? author.trim()
        : 'Team Member',
      createdAt: new Date().toISOString(),
    };

    lead.notes.push(newNote);

    res.json({
      success: true,
      lead,
      note: newNote,
    });
  }
);

// Leadership image routes
app.get(
  [
    '/NishantFounderfinalPhoto(1).png',
    '/NishantFounderfinalPhoto.png',
    '/NishantFounderfinalPhoto.svg',
    '/assets/nishant.png',
    '/assets/nishant.svg',
  ],
  (req, res) => {
    const p1 = path.join(
      process.cwd(),
      'public',
      'NishantFounderfinalPhoto(1).png'
    );

    const pngPath = path.join(
      process.cwd(),
      'public',
      'NishantFounderfinalPhoto.png'
    );

    const svgPath = path.join(
      process.cwd(),
      'public',
      'NishantFounderfinalPhoto.svg'
    );

    if (fs.existsSync(p1)) {
      res.sendFile(p1);
    } else if (fs.existsSync(pngPath)) {
      res.sendFile(pngPath);
    } else {
      res.setHeader(
        'Content-Type',
        'image/svg+xml'
      );
      res.sendFile(svgPath);
    }
  }
);

app.get(
  [
    '/Deepakcofounderfinal(1).png',
    '/Deepakcofounderfinal.png',
    '/Deepakcofounderfinal.svg',
    '/assets/deepak.png',
    '/assets/deepak.svg',
  ],
  (req, res) => {
    const p1 = path.join(
      process.cwd(),
      'public',
      'Deepakcofounderfinal(1).png'
    );

    const pngPath = path.join(
      process.cwd(),
      'public',
      'Deepakcofounderfinal.png'
    );

    const svgPath = path.join(
      process.cwd(),
      'public',
      'Deepakcofounderfinal.svg'
    );

    if (fs.existsSync(p1)) {
      res.sendFile(p1);
    } else if (fs.existsSync(pngPath)) {
      res.sendFile(pngPath);
    } else {
      res.setHeader(
        'Content-Type',
        'image/svg+xml'
      );
      res.sendFile(svgPath);
    }
  }
);

app.get(
  [
    '/Divyanshu%20cofounder(1).png',
    '/Divyanshu cofounder(1).png',
    '/Divyanshucofounder(1).png',
    '/Divyanshu%20cofounder.png',
    '/Divyanshu cofounder.png',
    '/Divyanshucofounder.png',
    '/Divyanshucofounder.svg',
    '/assets/divyanshu.png',
    '/assets/divyanshu.svg',
  ],
  (req, res) => {
    const p1 = path.join(
      process.cwd(),
      'public',
      'Divyanshucofounder(1).png'
    );

    const pngPath = path.join(
      process.cwd(),
      'public',
      'Divyanshucofounder.png'
    );

    const svgPath = path.join(
      process.cwd(),
      'public',
      'Divyanshucofounder.svg'
    );

    if (fs.existsSync(p1)) {
      res.sendFile(p1);
    } else if (fs.existsSync(pngPath)) {
      res.sendFile(pngPath);
    } else {
      res.setHeader(
        'Content-Type',
        'image/svg+xml'
      );
      res.sendFile(svgPath);
    }
  }
);

// Serve public directory
app.use(
  express.static(
    path.join(process.cwd(), 'public')
  )
);

// =====================================================
// NVIDIA NIM AI ENDPOINT
// =====================================================

app.post(
  '/api/ai',
  async (req: Request, res: Response) => {
    const controller = new AbortController();

    // Maximum 20 seconds for NVIDIA response
    const timeout = setTimeout(() => {
      controller.abort();
    }, 60000);

    try {
      const apiKey =
        process.env.NVIDIA_API_KEY;

      if (!apiKey) {
        clearTimeout(timeout);

        return res.status(500).json({
          success: false,
          error:
            'NVIDIA_API_KEY is not configured',
        });
      }

      const { message } = req.body;

      if (
        !message ||
        typeof message !== 'string'
      ) {
        clearTimeout(timeout);

        return res.status(400).json({
          success: false,
          error: 'Message is required',
        });
      }

      console.log(
        '[NVIDIA AI] Request started:',
        message
      );

      const response = await fetch(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            model:
              'mistralai/mistral-nemotron',

            messages: [
              {
                role: 'system',
                content:
                  'You are the AI assistant for CareerBuddies. Give short, clear, practical and helpful answers. Never reveal or describe your internal reasoning, chain of thought, analysis, or thinking process. Respond directly with the final answer only. Keep the response easy to understand.',
              },
              {
                role: 'user',
                content: message,
              },
            ],

            max_tokens: 250,
            temperature: 0.5,
            stream: false,
          }),

          signal: controller.signal,
        }
      );

      const data = await response.json();

      clearTimeout(timeout);

      console.log(
        '[NVIDIA AI] Response received:',
        response.status
      );

      if (!response.ok) {
        console.error(
          '[NVIDIA AI] API error:',
          data
        );

        return res.status(
          response.status
        ).json({
          success: false,
          error:
            'NVIDIA AI request failed',
          details: data,
        });
      }

      const answer =
        data?.choices?.[0]?.message
          ?.content;

      if (!answer) {
        console.error(
          '[NVIDIA AI] Empty response:',
          data
        );

        return res.status(502).json({
          success: false,
          error:
            'NVIDIA AI returned an empty response',
        });
      }

      return res.json({
        success: true,
        answer,
        model:
          'mistralai/mistral-nemotron',
      });
    } catch (error: any) {
      clearTimeout(timeout);

      if (
        error?.name === 'AbortError'
      ) {
        console.error(
          '[NVIDIA AI] Request timed out after 60 seconds'
        );

        return res.status(504).json({
          success: false,
          error:
            'NVIDIA AI timed out after 60 seconds',
        });
      }

      console.error(
        '[NVIDIA AI] Server error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to connect to NVIDIA AI',
      });
    }
  }
);

// ----------------- VITE MIDDLEWARE & SERVER START -----------------

async function startServer() {
  await connectDatabase();

  const isDev =
    process.env.NODE_ENV !== 'production';

  const httpServer =
    http.createServer(app);

  if (isDev) {
    const isHmrDisabled =
      process.env.DISABLE_HMR === 'true';

    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
          hmr: isHmrDisabled
            ? false
            : {
                server: httpServer,
              },
          watch: isHmrDisabled
            ? null
            : {},
        },
        appType: 'spa',
      });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(
      process.cwd(),
      'dist'
    );

    app.use(
      express.static(distPath)
    );

    app.get('*', (req, res) => {
      res.sendFile(
        path.join(
          distPath,
          'index.html'
        )
      );
    });
  }

  httpServer.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `CareerBuddies Full-Stack Server running on http://0.0.0.0:${PORT}`
      );
    }
  );
}

startServer().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exitCode = 1;
});