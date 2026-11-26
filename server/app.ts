import express, { NextFunction, Request, Response } from 'express';
import { UserRole } from '../src/types/auth';
import { ResearchDb } from './db';
import { ResearchError } from './errors';

type Authed = Request & { user: { id: string; username: string; fullName: string; role: UserRole } };

function fail(res: Response, error: unknown) {
  if (error instanceof ResearchError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error.' });
}

function param(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

function queryText(req: Request, name: string): string {
  const value = req.query[name];
  return typeof value === 'string' ? value : '';
}

export function createApp(db: ResearchDb) {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const user = token ? db.userByToken(token) : null;
    if (!user) {
      res.status(401).json({ error: 'Sign in is required.' });
      return;
    }
    (req as Authed).user = user;
    next();
  };

  const allow =
    (...roles: UserRole[]) =>
    (req: Request, res: Response, next: NextFunction) => {
      if (!roles.includes((req as Authed).user.role)) {
        res.status(403).json({ error: 'You do not have access to this action.' });
        return;
      }
      next();
    };

  const write = allow('administrator', 'research_manager');
  const design = allow('administrator');

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/auth/roster', (_req, res) => {
    res.json(db.roster());
  });

  app.post('/api/auth/login', (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }
    const session = db.authenticate(username, password);
    if (!session) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    res.json(session);
  });

  app.post('/api/auth/logout', (req, res) => {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token) db.logout(token);
    res.status(204).end();
  });

  app.post('/api/admin/reset', (_req, res) => {
    try {
      db.reset();
      res.json({ status: 'reset' });
    } catch (error) {
      fail(res, error);
    }
  });

  app.get('/api/forms', (_req, res) => {
    res.json(db.forms());
  });

  app.post('/api/forms/:id/schema', authenticate, design, (req, res) => {
    try {
      res.json(db.saveFormSchema(param(req), req.body?.schema ?? req.body, (req as Authed).user));
    } catch (error) {
      fail(res, error);
    }
  });

  app.get('/api/projects/choices', authenticate, (_req, res) => {
    res.json(db.projectChoices());
  });

  app.get('/api/projects', authenticate, (_req, res) => {
    res.json(db.listProjects());
  });

  app.get('/api/projects/:id', authenticate, (req, res) => {
    try {
      res.json(db.getProject(param(req)));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/projects', authenticate, write, (req, res) => {
    try {
      res.status(201).json(db.createProject(req.body, (req as Authed).user));
    } catch (error) {
      fail(res, error);
    }
  });

  app.put('/api/projects/:id', authenticate, write, (req, res) => {
    try {
      res.json(db.updateProject(param(req), req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.patch('/api/projects/:id/status', authenticate, write, (req, res) => {
    try {
      res.json(db.setProjectStatus(param(req), typeof req.body?.status === 'string' ? req.body.status : ''));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/projects/:id/duplicate', authenticate, write, (req, res) => {
    try {
      res.status(201).json(db.duplicateProject(param(req)));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/projects/:id/archive', authenticate, write, (req, res) => {
    try {
      res.json(db.archiveProject(param(req)));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/projects/:id/restore', authenticate, write, (req, res) => {
    try {
      res.json(db.restoreProject(param(req)));
    } catch (error) {
      fail(res, error);
    }
  });

  app.delete('/api/projects/:id', authenticate, write, (req, res) => {
    try {
      db.deleteProject(param(req));
      res.status(204).end();
    } catch (error) {
      fail(res, error);
    }
  });

  app.get('/api/participants/choices', authenticate, (_req, res) => {
    res.json(db.participantChoices());
  });

  app.get('/api/participants', authenticate, (req, res) => {
    try {
      res.json(
        db.searchParticipants({
          surname: queryText(req, 'surname'),
          participantId: queryText(req, 'participantId'),
          email: queryText(req, 'email'),
          status: queryText(req, 'status'),
          recruitmentSource: queryText(req, 'recruitmentSource'),
          city: queryText(req, 'city'),
          ageGroup: queryText(req, 'ageGroup'),
          segment: queryText(req, 'segment'),
          study: queryText(req, 'study'),
          screeningStatus: queryText(req, 'screeningStatus'),
        }),
      );
    } catch (error) {
      fail(res, error);
    }
  });

  app.get('/api/participants/:id', authenticate, (req, res) => {
    try {
      res.json(db.getParticipant(param(req)));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/participants', authenticate, write, (req, res) => {
    try {
      res.status(201).json(db.createParticipant(req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.patch('/api/participants/:id/status', authenticate, write, (req, res) => {
    try {
      res.json(db.setParticipantStatus(param(req), typeof req.body?.status === 'string' ? req.body.status : ''));
    } catch (error) {
      fail(res, error);
    }
  });

  app.put('/api/participants/:id', authenticate, write, (req, res) => {
    try {
      res.json(db.updateParticipant(param(req), req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/participants/:id/notes', authenticate, write, (req, res) => {
    try {
      res.status(201).json(db.addNote(param(req), req.body, (req as Authed).user));
    } catch (error) {
      fail(res, error);
    }
  });

  app.put('/api/notes/:id', authenticate, write, (req, res) => {
    try {
      res.json(db.updateNote(param(req), req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.delete('/api/notes/:id', authenticate, write, (req, res) => {
    try {
      db.deleteNote(param(req));
      res.status(204).end();
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/participations', authenticate, write, (req, res) => {
    try {
      res.status(201).json(db.createParticipation(req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.get('/api/surveys', authenticate, (_req, res) => {
    res.json(db.listSurveys());
  });

  app.get('/api/surveys/:id', authenticate, (req, res) => {
    try {
      res.json(db.getSurvey(param(req)));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/surveys', authenticate, design, (req, res) => {
    try {
      res.status(201).json(db.createSurvey(req.body, (req as Authed).user));
    } catch (error) {
      fail(res, error);
    }
  });

  app.put('/api/surveys/:id', authenticate, design, (req, res) => {
    try {
      res.json(db.updateSurvey(param(req), req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.put('/api/surveys/:id/schema', authenticate, design, (req, res) => {
    try {
      res.json(db.saveSurveySchema(param(req), req.body?.schema ?? req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.patch('/api/surveys/:id/status', authenticate, design, (req, res) => {
    try {
      res.json(db.setSurveyStatus(param(req), typeof req.body?.status === 'string' ? req.body.status : ''));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/surveys/:id/duplicate', authenticate, design, (req, res) => {
    try {
      res.status(201).json(db.duplicateSurvey(param(req), (req as Authed).user));
    } catch (error) {
      fail(res, error);
    }
  });

  app.delete('/api/surveys/:id', authenticate, design, (req, res) => {
    try {
      db.deleteSurvey(param(req));
      res.status(204).end();
    } catch (error) {
      fail(res, error);
    }
  });

  app.get('/api/surveys/:id/responses', authenticate, (req, res) => {
    try {
      res.json(db.surveyResponses(param(req)));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/surveys/:id/responses', authenticate, (req, res) => {
    try {
      if ((req as Authed).user.role === 'readonly') {
        res.status(403).json({ error: 'You do not have access to this action.' });
        return;
      }
      res.status(201).json(db.addSurveyResponse(param(req), req.body, (req as Authed).user));
    } catch (error) {
      fail(res, error);
    }
  });

  app.get('/api/screeners', authenticate, (_req, res) => {
    res.json(db.listScreeners());
  });

  app.get('/api/screeners/:id', authenticate, (req, res) => {
    try {
      res.json(db.getScreener(param(req)));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/screeners', authenticate, design, (req, res) => {
    try {
      res.status(201).json(db.createScreener(req.body, (req as Authed).user));
    } catch (error) {
      fail(res, error);
    }
  });

  app.put('/api/screeners/:id', authenticate, design, (req, res) => {
    try {
      res.json(db.updateScreener(param(req), req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.put('/api/screeners/:id/schema', authenticate, design, (req, res) => {
    try {
      res.json(db.saveScreenerSchema(param(req), req.body?.schema ?? req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.put('/api/screeners/:id/rules', authenticate, design, (req, res) => {
    try {
      res.json(db.saveScreenerRules(param(req), req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.patch('/api/screeners/:id/status', authenticate, design, (req, res) => {
    try {
      res.json(db.setScreenerStatus(param(req), typeof req.body?.status === 'string' ? req.body.status : ''));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/screeners/:id/duplicate', authenticate, design, (req, res) => {
    try {
      res.status(201).json(db.duplicateScreener(param(req), (req as Authed).user));
    } catch (error) {
      fail(res, error);
    }
  });

  app.delete('/api/screeners/:id', authenticate, design, (req, res) => {
    try {
      db.deleteScreener(param(req));
      res.status(204).end();
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/screener-responses', authenticate, write, (req, res) => {
    try {
      res.status(201).json(db.submitScreener(req.body, (req as Authed).user));
    } catch (error) {
      fail(res, error);
    }
  });

  app.get('/api/incentives', authenticate, (req, res) => {
    try {
      res.json(
        db.listIncentives({
          status: typeof req.query.status === 'string' ? req.query.status : '',
          projectId: typeof req.query.projectId === 'string' ? req.query.projectId : '',
        }),
      );
    } catch (error) {
      fail(res, error);
    }
  });

  app.post('/api/incentives', authenticate, write, (req, res) => {
    try {
      res.status(201).json(db.createIncentive(req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  app.put('/api/incentives/:id', authenticate, write, (req, res) => {
    try {
      res.json(db.updateIncentive(param(req), req.body));
    } catch (error) {
      fail(res, error);
    }
  });

  return app;
}
