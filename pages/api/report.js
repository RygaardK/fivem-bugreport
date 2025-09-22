import { supabaseAdmin } from '../../lib/supabaseServer';
import { randomUUID } from 'crypto';

// Helper: create GitHub issue (best effort, non-blocking)
async function maybeCreateGithubIssue(row) {
  if (!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO)) return;
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

export default async function handler(req, res) {
  try {
    // LISTA BUGGAR
    if (req.method === 'GET') {
      // filter ?status=resolved/open
      const { status } = req.query;
      let query = supabaseAdmin
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ reports: data });
    }

    // UPPDATERA STATUS
    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      if (!id || !status) return res.status(400).json({ error: 'id och status krävs' });
      const patch = { status };
      if (status === 'resolved') patch.resolved_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('bug_reports')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ report: data });
    }

    // SKAPA NY BUGG
    if (req.method === 'POST') {
      const body = req.body;
      const row = {
        id: randomUUID(),
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
        status: 'open',
      };
      const { data, error } = await supabaseAdmin.from('bug_reports').insert([row]).select();
      if (error) throw error;
      maybeCreateGithubIssue(row); // Fire & forget
      return res.status(200).json({ report: data[0] });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('report endpoint error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
