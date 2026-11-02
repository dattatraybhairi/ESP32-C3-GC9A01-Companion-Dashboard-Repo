import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // GitHub Repository Creation & Multi-File Commit Endpoint
  app.post('/api/github/push', async (req, res) => {
    try {
      const {
        token,
        repoName,
        description = 'ESP32-C3 + GC9A01 + DHT11 Smart Companion & IoT Dashboard',
        isPrivate = false,
        commitMessage = 'Initial commit: ESP32-C3 GC9A01 firmware, schematic, and README',
        files
      } = req.body ?? {};

      if (!token || typeof token !== 'string' || token.trim().length < 10) {
        return res.status(400).json({ error: 'A valid GitHub Personal Access Token is required.' });
      }
      if (!repoName || typeof repoName !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(repoName.trim())) {
        return res.status(400).json({ error: 'A valid repository name is required.' });
      }
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'No repository files provided to push.' });
      }

      const ghHeaders = {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ESP32C3-Companion-Repo-Studio'
      };

      // 1. Verify authenticated GitHub user
      const userRes = await fetch('https://api.github.com/user', { headers: ghHeaders });
      if (!userRes.ok) {
        const errBody = await userRes.json().catch(() => ({}));
        return res.status(userRes.status).json({
          error: errBody.message || 'GitHub authentication failed. Check your Personal Access Token.'
        });
      }
      const userData = (await userRes.json()) as { login: string };
      const owner = userData.login;
      const cleanRepo = repoName.trim();

      // 2. Check if repository exists, or create it with auto_init: true so main branch exists
      let repoRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
        headers: ghHeaders
      });

      if (repoRes.status === 404) {
        const createRes = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: ghHeaders,
          body: JSON.stringify({
            name: cleanRepo,
            description,
            private: Boolean(isPrivate),
            auto_init: true
          })
        });
        if (!createRes.ok) {
          const errBody = await createRes.json().catch(() => ({}));
          return res.status(createRes.status).json({
            error: errBody.message || 'Failed to create repository on GitHub.'
          });
        }
        repoRes = createRes;
      }

      const repoData = (await repoRes.json()) as {
        html_url: string;
        full_name: string;
        default_branch: string;
      };
      const defaultBranch = repoData.default_branch || 'main';

      // 3. Push each file sequentially via Contents API (handles both new and existing files)
      let lastCommitSha = '';
      for (const file of files as Array<{ path: string; content: string }>) {
        // Check if file already exists to get its sha
        let existingSha: string | undefined;
        const existingRes = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${file.path}?ref=${defaultBranch}`,
          { headers: ghHeaders }
        );
        if (existingRes.ok) {
          const existingJson = (await existingRes.json()) as { sha?: string };
          existingSha = existingJson.sha;
        }

        const putRes = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${file.path}`,
          {
            method: 'PUT',
            headers: ghHeaders,
            body: JSON.stringify({
              message: commitMessage,
              content: Buffer.from(file.content, 'utf8').toString('base64'),
              branch: defaultBranch,
              ...(existingSha ? { sha: existingSha } : {})
            })
          }
        );

        if (!putRes.ok) {
          const errBody = await putRes.json().catch(() => ({}));
          return res.status(putRes.status).json({
            error: `Failed to push ${file.path}: ${errBody.message || putRes.statusText}`
          });
        }

        const putData = (await putRes.json()) as { commit?: { sha?: string } };
        if (putData.commit?.sha) {
          lastCommitSha = putData.commit.sha;
        }
      }

      return res.json({
        ok: true,
        fullName: repoData.full_name,
        repoUrl: repoData.html_url,
        commitSha: lastCommitSha
      });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Unexpected server error during GitHub push.'
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
