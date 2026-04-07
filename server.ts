import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/routes/api.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Basic Auth Middleware for Vercel deployments
  app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (host.endsWith('.vercel.app')) {
      const authHeader = req.headers.authorization;
      const expectedPassword = process.env.SITE_PASSWORD;
      
      if (expectedPassword) {
        if (!authHeader) {
          res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
          res.status(401).send('Auth required');
          return;
        }
        
        const basicAuth = authHeader.split(' ')[1];
        try {
          const decoded = Buffer.from(basicAuth, 'base64').toString('utf-8');
          const [, pwd] = decoded.split(':');
          
          if (pwd !== expectedPassword) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
            res.status(401).send('Auth required');
            return;
          }
        } catch (e) {
          res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
          res.status(401).send('Auth required');
          return;
        }
      }
    }
    next();
  });

  // API Routes
  app.use("/api", apiRouter);

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
