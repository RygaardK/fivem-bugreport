import { useEffect, useState, useRef } from 'react';

export default function Home() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState('Medium');
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Message states
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: string }
  // Bug list state
  const [showList, setShowList] = useState(false);
  const [bugs, setBugs] = useState([]);
  const [isLoadingBugs, setIsLoadingBugs] = useState(false);
  const [bugFilter, setBugFilter] = useState('open');

  async function fetchBugs(filter = bugFilter) {
    setIsLoadingBugs(true);
    try {
      const q = filter ? `?status=${encodeURIComponent(filter)}` : '';
      const res = await fetch('/api/report' + q);
      if (!res.ok) throw new Error('Kunde inte hämta buggar');
      const data = await res.json();
      setBugs(data.reports || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Fel vid hämtning av buggar: ' + err.message });
    } finally {
      setIsLoadingBugs(false);
    }
  }

  async function updateBugStatus(id, status) {
    try {
      const res = await fetch('/api/report', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error('Kunde inte uppdatera status');
      const data = await res.json();
      setBugs(prev => prev.map(b => b.id === id ? data.report : b));
      setMessage({ type: 'success', text: 'Status uppdaterad' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Fel vid statusuppdatering: ' + err.message });
    }
  }

  useEffect(() => {
    if (showList) fetchBugs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showList, bugFilter]);
  
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
    setIsUploading(true);
    setMessage(null);
    
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Uppladdning misslyckades');
      }
      
      const data = await res.json();
      const u = data.uploaded[0];
      setAttachments(prev => [...prev, u]);
      // Optional: insert markdown link into description
      setDescription(prev => prev + `\n\n![${u.filename}](${u.url})\n`);
      
      setMessage({ type: 'success', text: `Fil "${file.name}" uppladdad!` });
    } catch (error) {
      setMessage({ type: 'error', text: `Fel vid uppladdning: ${error.message}` });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    
    try {
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
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Något gick fel vid skickandet');
      }
      
      setMessage({ type: 'success', text: '🎉 Buggrapport skickad framgångsrikt!' });
      
      // Reset form
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setSteps('');
        setExpected('');
        setActual('');
        setAttachments([]);
        setPriority('Medium');
        setMessage(null);
      }, 3000);
      
    } catch (error) {
      setMessage({ type: 'error', text: `Fel: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ 
      width: '100vw', 
      backgroundColor: '#999',
    }}>    
    <div style={{ 
      maxWidth: 900, 
      margin: '2rem auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🐛 Rapportera bugg till NewLife
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem', margin: 0 }}>
          Hjälp oss att förbättra systemet genom att rapportera buggar du hittar
        </p>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
          backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            Titel *
            <span style={{ fontSize: '0.9rem', fontWeight: '400', color: '#6b7280', marginLeft: '0.5rem' }}>
              (Kortfattad beskrivning av problemet)
            </span>
          </label>
          <input 
            placeholder="t.ex. Spelet kraschar när jag öppnar inventoriet" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              fontSize: '1rem',
              transition: 'border-color 0.2s',
              outline: 'none'
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            Beskrivning
            <span style={{ fontSize: '0.9rem', fontWeight: '400', color: '#6b7280', marginLeft: '0.5rem' }}>
              (Detaljerad förklaring av vad som händer)
            </span>
          </label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            rows={6} 
            placeholder="Beskriv buggen i detalj..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              fontSize: '1rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
              outline: 'none'
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            Steg för att reproducera
            <span style={{ fontSize: '0.9rem', fontWeight: '400', color: '#6b7280', marginLeft: '0.5rem' }}>
              (Hur kan vi återskapa problemet?)
            </span>
          </label>
          <textarea 
            value={steps} 
            onChange={e => setSteps(e.target.value)} 
            rows={4} 
            placeholder="1. Gå till...&#10;2. Klicka på...&#10;3. Problemet uppstår..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              fontSize: '1rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
              outline: 'none'
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
              Förväntat resultat
              <span style={{ fontSize: '0.8rem', fontWeight: '400', color: '#6b7280', display: 'block' }}>
                (Vad skulle ha hänt?)
              </span>
            </label>
            <textarea 
              value={expected} 
              onChange={e => setExpected(e.target.value)} 
              rows={3} 
              placeholder="Jag förväntade mig att..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                resize: 'vertical',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
              Faktiskt resultat
              <span style={{ fontSize: '0.8rem', fontWeight: '400', color: '#6b7280', display: 'block' }}>
                (Vad hände istället?)
              </span>
            </label>
            <textarea 
              value={actual} 
              onChange={e => setActual(e.target.value)} 
              rows={3} 
              placeholder="Istället så..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                resize: 'vertical',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
        </div>

        <div 
          ref={dropRef} 
          style={{ 
            border: `2px dashed ${isUploading ? '#3b82f6' : '#d1d5db'}`, 
            borderRadius: '12px',
            padding: '2rem', 
            textAlign: 'center',
            backgroundColor: isUploading ? '#eff6ff' : '#f9fafb',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📎</div>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#374151' }}>
              {isUploading ? 'Laddar upp...' : 'Lägg till bilagor'}
            </p>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              Klistra in en bild (Ctrl/Cmd+V) eller dra & släpp filer här
            </p>
          </div>
          
          <input 
            type="file" 
            onChange={e => {
              const files = e.target.files;
              if (files.length) uploadFile(files[0]);
            }}
            style={{
              margin: '1rem 0',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white'
            }}
            disabled={isUploading}
          />
          
          {isUploading && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '50%',
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  animation: 'progress 1s linear infinite'
                }}></div>
              </div>
            </div>
          )}
          
          {attachments.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
              gap: '1rem', 
              marginTop: '1.5rem' 
            }}>
              {attachments.map((a, i) => (
                <div key={i} style={{ 
                  position: 'relative',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: 'white'
                }}>
                  <img 
                    src={a.url} 
                    alt={a.filename} 
                    style={{ 
                      width: '100%', 
                      height: '100px', 
                      objectFit: 'cover' 
                    }} 
                  />
                  <div style={{ padding: '0.5rem' }}>
                    <small style={{ color: '#374151', fontSize: '0.8rem' }}>
                      {a.filename}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            Prioritet
            <span style={{ fontSize: '0.9rem', fontWeight: '400', color: '#6b7280', marginLeft: '0.5rem' }}>
              (Hur allvarligt är problemet?)
            </span>
          </label>
          <select 
            value={priority} 
            onChange={e => setPriority(e.target.value)} 
            style={{
              padding: '12px',
              borderRadius: '8px',
              color: '#374151',
              border: '2px solid #e5e7eb',
              fontSize: '1rem',
              backgroundColor: 'white',
              minWidth: '200px',
              transition: 'border-color 0.2s',
              outline: 'none'
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          >
            <option value="Blockerande">🚨 Blockerande - Hindrar all användning</option>
            <option value="Hög">🔴 Hög - Allvarligt problem</option>
            <option value="Medium">🟡 Medium - Märkbart problem</option>
            <option value="Låg">🟢 Låg - Mindre problem</option>
          </select>
        </div>

        <div style={{ paddingTop: '1rem' }}>
          <button 
            type="submit" 
            disabled={isSubmitting || isUploading || !title.trim()}
            style={{ 
              padding: '16px 32px',
              background: isSubmitting || !title.trim() ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: isSubmitting || !title.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto'
            }}
          >
            {isSubmitting ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #ffffff40',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Skickar rapport...
              </>
            ) : (
              <>
                🚀 Skicka rapport
              </>
            )}
          </button>
        </div>
      </form>

      {/* BUG LIST SECTION */}
      <div style={{ marginTop: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setShowList(s => !s)}
            style={{
              padding: '10px 18px',
              background: showList ? '#374151' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {showList ? 'Dölj buggar' : 'Visa buggar'}
          </button>
          {showList && (
            <select
              value={bugFilter}
              onChange={e => { setBugFilter(e.target.value); fetchBugs(e.target.value); }}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="open">Öppna</option>
              <option value="in_progress">Pågående</option>
              <option value="resolved">Klara</option>
              <option value="">Alla</option>
            </select>
          )}
          {showList && (
            <button
              type="button"
              onClick={() => fetchBugs()}
              style={{
                padding: '8px 14px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >Uppdatera</button>
          )}
        </div>

        {showList && (
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            background: 'white',
            padding: '1rem',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            {isLoadingBugs && <p style={{ margin: 0 }}>Hämtar buggar...</p>}
            {!isLoadingBugs && bugs.length === 0 && (
              <p style={{ margin: 0, color: '#6b7280' }}>Inga buggar hittades.</p>
            )}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {bugs.map(b => {
                const isResolved = b.status === 'resolved';
                const isInProgress = b.status === 'in_progress';
                return (
                  <li
                    key={b.id}
                    style={{
                      border: '1px solid ' + (isResolved ? '#10b981' : isInProgress ? '#f59e0b' : '#e5e7eb'),
                      background: isResolved ? '#f0fdf4' : isInProgress ? '#fffbeb' : '#f9fafb',
                      borderRadius: '8px',
                      padding: '0.75rem 0.9rem',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#111827' }}>{b.title}</strong>
                        <span style={{
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background: isResolved ? '#10b981' : isInProgress ? '#f59e0b' : '#6366f1',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>{b.status || 'open'}</span>
                        {b.priority && (
                          <span style={{
                            fontSize: '0.65rem',
                            background: '#1f2937',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>{b.priority}</span>
                        )}
                        <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                          {new Date(b.created_at).toLocaleString('sv-SE')}
                        </span>
                      </div>
                      {b.description && (
                        <p style={{ margin: '0.35rem 0 0.25rem', fontSize: '0.8rem', color: '#374151', whiteSpace: 'pre-line' }}>
                          {b.description.length > 300 ? b.description.slice(0,300) + '…' : b.description}
                        </p>
                      )}
                      {(() => {
                        // Normalisera attachments: kan vara null, objekt, string eller redan array
                        let att = b.attachments;
                        if (att && !Array.isArray(att)) {
                          // Om JSON lagrats som string
                          if (typeof att === 'string') {
                            try { att = JSON.parse(att); } catch { att = []; }
                          } else if (typeof att === 'object') {
                            // Om ett enskilt objekt lagrats istället för array
                            att = [att];
                          }
                        }
                        if (!Array.isArray(att)) att = [];
                        if (att.length === 0) return null;
                        return (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {att.map((a,i) => (
                              <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.65rem', color: '#2563eb', textDecoration: 'underline' }}>
                                {a?.filename || 'bilaga'}
                              </a>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {b.status !== 'in_progress' && b.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => updateBugStatus(b.id, 'in_progress')}
                          style={{
                            padding: '4px 8px',
                            background: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                          }}
                        >Pågår</button>
                      )}
                      {b.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => updateBugStatus(b.id, 'resolved')}
                          style={{
                            padding: '4px 8px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                          }}
                        >Klar</button>
                      )}
                      {b.status === 'resolved' && (
                        <button
                          type="button"
                          onClick={() => updateBugStatus(b.id, 'open')}
                          style={{
                            padding: '4px 8px',
                            background: '#374151',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                          }}
                        >Återöppna</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
    </div>
  );
}
