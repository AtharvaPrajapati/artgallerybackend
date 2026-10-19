import { Router } from 'express';
import { getHomepage } from '../controllers/homeController.js';

const router = Router();

router.get('/', getHomepage);

export default router;
