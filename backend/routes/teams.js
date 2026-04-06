import express from 'express';
import { getTeams, createTeam, getTeamById, deleteTeam, seedTeams } from '../controllers/teamsController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/',         auth, getTeams);
router.post('/',        auth, createTeam);
router.get('/:id',      auth, getTeamById);
router.delete('/:id',   auth, deleteTeam);
router.post('/seed',    seedTeams);          // no auth — for setup

export { router as teamsRouter };
