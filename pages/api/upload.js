// pages/api/upload.js
import formidable from 'formidable';
import fs from 'fs';
import { supabaseAdmin } from '../../lib/supabaseServer';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: { bodyParser: false },
};

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({ multiples: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { files } = await parseForm(req);

    // support single or multiple files sent as `file`
    const fileField = files.file || files.files || files.upload;
    if (!fileField) return res.status(400).json({ error: 'No file provided' });

    const fileList = Array.isArray(fileField) ? fileField : [fileField];
    const uploaded = [];

    for (const f of fileList) {
      const buffer = await fs.promises.readFile(f.filepath);
      const filename = `${Date.now()}_${uuidv4()}_${f.originalFilename || f.newFilename || 'file'}`;
      const bucket = process.env.SUPABASE_BUCKET || 'bug-attachments';
      const path = `${filename}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, buffer, { contentType: f.mimetype || 'application/octet-stream', upsert: false });

      if (uploadError) throw uploadError;

      // create signed url (7 days) — if bucket is public you can instead construct public url
      const { data: signedData, error: signedErr } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      if (signedErr) throw signedErr;

      uploaded.push({ path, url: signedData.signedUrl, filename: f.originalFilename || filename });
    }

    return res.status(200).json({ uploaded });
  } catch (err) {
    console.error('upload error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
