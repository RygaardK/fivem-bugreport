import { useEffect, useState, useRef } from 'react';

export default function Home() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState('Medium');
  const dropRef = useRef();

  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image')) {
          const file = item.getAsFile();
          await uploadFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDrop = async (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      for (const f of files) await uploadFile(f);
    };
    const onDragOver = (e) => e.preventDefault();
    el.addEventListener('drop', onDrop);
    el.addEventListener('dragover', onDragOver);
    return () => {
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('dragover', onDragOver);
    };
  }, []);

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      alert('Upload failed');
      return;
    }
    const data = await res.json();
    const u = data.uploaded[0];
    setAttachments(prev => [...prev, u]);
    // Optional: insert markdown link into description
    setDescription(prev => prev + `\n\n![${u.filename}](${u.url})\n`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      title, description, steps, expected, actual,
      reproducibility: '', timestamp: new Date().toISOString(),
      serverInfo: '', resources: '', logs: '',
      attachments, priority, reporter: '',
    };
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      alert('Rapport skapad!');
      // reset or navigate
    } else {
      const err = await res.json();
      alert('Fel: ' + (err?.error || 'unknown'));
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: 20 }}>
      <h1>🐛 Rapportera bugg</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Titel" value={title} onChange={e => setTitle(e.target.value)} required style={{width:'100%',padding:8,marginBottom:8}}/>
        <label>Beskrivning</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} style={{width:'100%'}} />
        <label>Steg för att reproducera</label>
        <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={4} style={{width:'100%'}} />
        <label>Förväntat</label>
        <textarea value={expected} onChange={e => setExpected(e.target.value)} rows={2} style={{width:'100%'}} />
        <label>Faktiskt</label>
        <textarea value={actual} onChange={e => setActual(e.target.value)} rows={2} style={{width:'100%'}} />

        <div ref={dropRef} style={{ border: '2px dashed #ccc', padding: 20, marginTop: 12 }}>
          <p>Klistra in en bild (Ctrl/Cmd+V) eller dra & släpp här</p>
          <input type="file" onChange={e => {
            const files = e.target.files;
            if (files.length) uploadFile(files[0]);
          }} />
          <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
            {attachments.map((a, i) => (
              <div key={i} style={{ width: 120, textAlign:'center' }}>
                <img src={a.url} alt={a.filename} style={{ width:'100%', height:80, objectFit:'cover' }} />
                <small>{a.filename}</small>
              </div>
            ))}
          </div>
        </div>

        <label>Prioritet</label>
        <select value={priority} onChange={e => setPriority(e.target.value)} style={{marginBottom:12}}>
          <option>Blockerande</option>
          <option>Hög</option>
          <option>Medium</option>
          <option>Låg</option>
        </select>

        <div>
          <button type="submit" style={{ padding:'10px 16px', background:'#0069ff', color:'white', borderRadius:6 }}>Skicka rapport</button>
        </div>
      </form>
    </div>
  );
}
