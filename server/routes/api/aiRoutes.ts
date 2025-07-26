
import { Router, Request, Response } from 'express';
import PersonaManager from '../../ai/PersonaManager.js';
import ResponseValidator from '../../ai/ResponseValidator.js';
import { requireAuth } from '../../middleware/security.js';

const router = Router();
const personaManager = PersonaManager.getInstance();
const responseValidator = ResponseValidator.getInstance();

// Generate AI response with persona
router.post('/ai/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, context } = req.body;
    const user = (req as any).user;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    const personaContext = {
      userId: user?.id,
      userRole: user?.role,
      isInternal: ['admin', 'designer', 'manufacturer', 'salesperson'].includes(user?.role),
      ...context
    };

    const response = await personaManager.generateResponse(prompt, personaContext);
    
    // Validate the response
    const validation = responseValidator.validateResponse(response.content, {
      persona: response.persona,
      userRole: user?.role,
      requestType: context?.requestType
    });

    res.json({
      success: true,
      data: {
        response,
        validation
      }
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI response',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Set active persona for user
router.post('/ai/persona', requireAuth, async (req: Request, res: Response) => {
  try {
    const { persona } = req.body;
    const user = (req as any).user;

    if (!persona) {
      return res.status(400).json({
        success: false,
        message: 'Persona is required'
      });
    }

    personaManager.setActivePersona(user.id, persona);

    res.json({
      success: true,
      message: `Persona set to ${persona}`
    });
  } catch (error) {
    console.error('Error setting persona:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set persona',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available personas
router.get('/ai/personas', requireAuth, async (req: Request, res: Response) => {
  try {
    const personas = personaManager.getAvailablePersonas();
    const personaDetails = personas.map(persona => {
      const config = personaManager.getPersonaConfig(persona);
      return {
        id: persona,
        ...config
      };
    });

    res.json({
      success: true,
      data: personaDetails
    });
  } catch (error) {
    console.error('Error getting personas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personas',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate response content
router.post('/ai/validate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { content, context } = req.body;
    const user = (req as any).user;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required for validation'
      });
    }

    const validation = responseValidator.validateResponse(content, {
      userRole: user?.role,
      ...context
    });

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
