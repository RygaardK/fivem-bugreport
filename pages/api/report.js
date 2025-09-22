import { supabaseAdmin } from '../../lib/supabaseServer';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;

  try {
    const row = {
      id: randomUUID(), // Generera ett unikt UUID för att undvika null constraint-fel
      title: body.title,
      description: body.description,
      steps: body.steps,
      expected: body.expected,
      actual: body.actual,
      reproducibility: body.reproducibility,
      occurred_at: body.timestamp ? new Date(body.timestamp) : null,
      server_info: body.serverInfo,
      resources: body.resources,
      logs: body.logs,
      attachments: body.attachments || [],
      priority: body.priority || 'Medium',
      reporter: body.reporter || null,
    };

    const { data, error } = await supabaseAdmin.from('bug_reports').insert([row]).select();

    if (error) throw error;

    // Optional: create GitHub issue if GITHUB_TOKEN + GITHUB_REPO set (toggle as you like)
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
      try {
        const [owner, repo] = process.env.GITHUB_REPO.split('/');
        const issueBody = [
          `**Beskrivning**\n\n${row.description || ''}`,
          `**Steg för att reproducera**\n\n${row.steps || ''}`,
          `**Förväntat**\n\n${row.expected || ''}`,
          `**Faktiskt**\n\n${row.actual || ''}`,
          `**Attachments**\n\n${(row.attachments || []).map(a => `[${a.filename}](${a.url})`).join('\n')}`,
        ].join('\n\n');

        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({ title: `[BUG] ${row.title}`, body: issueBody, labels: ['bug'] }),
        });
      } catch (ghErr) {
        console.warn('GitHub issue creation failed', ghErr);
      }
    }

    return res.status(200).json({ report: data[0] });
  } catch (err) {
    console.error('report error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
