import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const SUBJECTS = [
  { id: 'calc',    label: 'Calculus',    color: '#C2410C', bg: '#FFF7ED' },
  { id: 'bio',     label: 'Biology',     color: '#15803D', bg: '#F0FDF4' },
  { id: 'chem',    label: 'Chemistry',   color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'physics', label: 'Physics',     color: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'history', label: 'History',     color: '#92400E', bg: '#FFFBEB' },
  { id: 'cs',      label: 'Comp Sci',    color: '#BE185D', bg: '#FDF2F8' },
  { id: 'lit',     label: 'Literature',  color: '#065F46', bg: '#ECFDF5' },
  { id: 'stats',   label: 'Statistics',  color: '#4338CA', bg: '#EEF2FF' },
  { id: 'econ',    label: 'Economics',   color: '#9A3412', bg: '#FFF7ED' },
  { id: 'psych',   label: 'Psychology',  color: '#6D28D9', bg: '#F5F3FF' },
]
const TRACKS = ['AP', 'IB', 'College', 'USABO', 'AMC/AIME', 'SAT/ACT', 'Other']
const POST_TYPES = [
  { id: 'question',    label: 'Question',    color: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'explanation', label: 'Explanation', color: '#15803D', bg: '#F0FDF4' },
  { id: 'mistake',     label: 'Mistake',     color: '#C2410C', bg: '#FFF7ED' },
  { id: 'resource',    label: 'Resource',    color: '#7C3AED', bg: '#F5F3FF' },
]
const AVATAR_COLORS = ['#C2410C','#15803D','#7C3AED','#1D4ED8','#BE185D','#065F46','#92400E','#4338CA','#9A3412','#6D28D9']

function hashColor(str = '') {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(name = '') {
  return name.split(/[\s_]+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function Avatar({ name, size = 32, url, onClick }) {
  const color = hashColor(name)
  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '20', border: `1.5px solid ${color}40`, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, fontFamily: 'var(--mono)', userSelect: 'none',
      overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
    }}>
      {url ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(name)}
    </div>
  )
}

function AvatarUpload({ profile, onUpload }) {
  const [uploading, setUploading] = useState(false)
  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
      onUpload(url)
    }
    setUploading(false)
  }
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Avatar name={profile.display_name || profile.username} size={56} url={profile.avatar_url} />
      <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#18181B', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'default' : 'pointer', fontSize: 12, border: '2px solid #fff' }}>
        {uploading ? '·' : '+'}
        <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} disabled={uploading} />
      </label>
    </div>
  )
}

function Pill({ label, color, bg }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: bg, color, fontWeight: 600, fontFamily: 'var(--mono)', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>{label}</span>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: '#71717A', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>{label}</label>}
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '10px 14px', borderRadius: 8, border: '1.5px solid #E4E4E7',
  fontSize: 14, fontFamily: 'var(--sans)', outline: 'none', background: '#fff',
  width: '100%', transition: 'border-color .15s', color: '#18181B',
}

function UserProfileModal({ userId, currentProfile, posts, onClose }) {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => {
      setUserProfile(data)
      setLoading(false)
    })
  }, [userId])

  const userPosts = posts.filter(p => p.author_id === userId)
  const totalUpvotes = userPosts.reduce((s, p) => s + (p.upvotes ?? 0), 0)
  const joined = userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#A1A1AA', fontFamily: 'var(--mono)', fontSize: 13 }}>loading...</div>
        ) : (
          <>
            <div style={{ padding: '28px 28px 20px', borderBottom: '1.5px solid #F4F4F5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <Avatar name={userProfile?.display_name || userProfile?.username || '?'} size={64} url={userProfile?.avatar_url} />
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#A1A1AA', padding: '0 4px' }}>×</button>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#18181B', marginBottom: 2 }}>{userProfile?.display_name || userProfile?.username}</div>
              <div style={{ fontSize: 13, color: '#A1A1AA', fontFamily: 'var(--mono)', marginBottom: 10 }}>@{userProfile?.username}</div>
              {userProfile?.bio && <div style={{ fontSize: 14, color: '#52525B', lineHeight: 1.7, marginBottom: 12 }}>{userProfile.bio}</div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {userProfile?.track && <Pill label={userProfile.track} color="#4338CA" bg="#EEF2FF" />}
                <span style={{ fontSize: 12, color: '#A1A1AA', fontFamily: 'var(--mono)' }}>joined {joined}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: '1.5px solid #F4F4F5' }}>
              {[['Posts', userPosts.length], ['Upvotes', totalUpvotes], ['Track', userProfile?.track || '—']].map(([l, v], i) => (
                <div key={l} style={{ padding: '16px 0', textAlign: 'center', borderRight: i < 2 ? '1.5px solid #F4F4F5' : 'none' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#18181B', fontFamily: 'var(--mono)' }}>{v}</div>
                  <div style={{ fontSize: 11, color: '#A1A1AA', fontFamily: 'var(--mono)', marginTop: 2, letterSpacing: '0.06em' }}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
            {userPosts.length > 0 && (
              <div style={{ padding: '20px 28px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', fontFamily: 'var(--mono)', letterSpacing: '0.08em', marginBottom: 12 }}>RECENT POSTS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {userPosts.slice(0, 4).map(p => {
                    const typ = POST_TYPES.find(t => t.id === p.type) || POST_TYPES[0]
                    const sub = SUBJECTS.find(s => s.id === p.subject) || SUBJECTS[0]
                    return (
                      <div key={p.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #F4F4F5', background: '#FAFAFA' }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                          <Pill label={typ.label} color={typ.color} bg={typ.bg} />
                          <Pill label={sub.label} color={sub.color} bg={sub.bg} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#18181B', lineHeight: 1.4 }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: '#A1A1AA', fontFamily: 'var(--mono)', marginTop: 4 }}>{p.upvotes ?? 0} upvotes · {timeAgo(p.created_at)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ResetPasswordModal({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async () => {
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) { setError(updateError.message); return }
    setSuccess(true)
    setTimeout(onDone, 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#18181B', marginBottom: 6 }}>Password updated!</div>
            <div style={{ fontSize: 13, color: '#71717A' }}>Signing you in...</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#18181B', marginBottom: 6 }}>Set a new password</div>
            <div style={{ fontSize: 13, color: '#71717A', marginBottom: 24 }}>Choose a new password for your account.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="NEW PASSWORD">
                <input style={inputStyle} type="password" placeholder="at least 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
              </Field>
              <Field label="CONFIRM PASSWORD">
                <input style={inputStyle} type="password" placeholder="same password again"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
              </Field>
              {error && <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '9px 12px', borderRadius: 6, fontFamily: 'var(--mono)' }}>{error}</div>}
              <button onClick={submit} disabled={loading || !password || !confirm} style={{ background: '#18181B', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 500, cursor: loading || !password || !confirm ? 'default' : 'pointer', fontFamily: 'var(--sans)', opacity: loading || !password || !confirm ? 0.4 : 1, width: '100%' }}>
                {loading ? 'Saving...' : 'Update password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login') 
  const [resetSent, setResetSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [track, setTrack] = useState('AP')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (resetError) { setError(resetError.message); return }
        setResetSent(true)
        return
      }
      if (mode === 'signup') {
        if (!username.trim() || username.length < 3) { setError('Username must be 3+ characters.'); return }
        if (!/^[a-z0-9_]+$/.test(username)) { setError('Lowercase letters, numbers, underscores only.'); return }
        const { data: existing } = await supabase.from('profiles').select('username').eq('username', username).maybeSingle()
        if (existing) { setError('Username already taken.'); return }
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { username, display_name: displayName.trim() || username, track } } })
        if (signUpError) { setError(signUpError.message); return }
        if (data.user && !data.session) { setConfirmSent(true); return }
        onAuth(data.user)
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) { setError(signInError.message); return }
        onAuth(data.user)
      }
    } finally { setLoading(false) }
  }

  if (confirmSent) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA' }}>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: 10, color: '#18181B' }}>Check your email</div>
        <div style={{ fontSize: 14, color: '#71717A', lineHeight: 1.7 }}>Confirmation sent to <strong style={{ color: '#18181B' }}>{email}</strong>. Click the link to activate your account.</div>
      </div>
    </div>
  )

  if (resetSent) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA' }}>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📩</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: 10, color: '#18181B' }}>Reset link sent</div>
        <div style={{ fontSize: 14, color: '#71717A', lineHeight: 1.7, marginBottom: 24 }}>
          Check <strong style={{ color: '#18181B' }}>{email}</strong> for a reset link. Click it and you'll be able to set a new password.
        </div>
        <button onClick={() => { setResetSent(false); setMode('login') }} style={{ background: 'none', border: '1.5px solid #E4E4E7', borderRadius: 8, padding: '9px 20px', color: '#18181B', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 500 }}>
          Back to sign in
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', padding: 40 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400, color: '#18181B', letterSpacing: '-0.02em', marginBottom: 6 }}>ThreadStack</div>
          <div style={{ fontSize: 15, color: '#71717A' }}>A study forum for serious students.</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '28px', border: '1.5px solid #E4E4E7' }}>

          {mode !== 'forgot' && (
            <div style={{ display: 'flex', background: '#F4F4F5', borderRadius: 8, padding: 3, marginBottom: 24 }}>
              {[['login', 'Sign in'], ['signup', 'Create account']].map(([m, lbl]) => (
                <button key={m} onClick={() => { setMode(m); setError('') }} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#18181B' : '#A1A1AA', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{lbl}</button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div style={{ marginBottom: 22 }}>
              <button onClick={() => { setMode('login'); setError('') }} style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                ← Back to sign in
              </button>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#18181B', marginBottom: 4 }}>Reset your password</div>
              <div style={{ fontSize: 13, color: '#71717A' }}>Enter your email and we'll send you a reset link.</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <Field label="USERNAME">
                <input style={inputStyle} placeholder="your_handle" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} onKeyDown={e => e.key === 'Enter' && submit()} />
              </Field>
            )}
            {mode === 'signup' && (
              <Field label="DISPLAY NAME">
                <input style={inputStyle} placeholder="How others see you" value={displayName} onChange={e => setDisplayName(e.target.value)} onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} onKeyDown={e => e.key === 'Enter' && submit()} />
              </Field>
            )}

            <Field label="EMAIL">
              <input style={inputStyle} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} onKeyDown={e => e.key === 'Enter' && submit()} />
            </Field>

            {mode !== 'forgot' && (
              <Field label="PASSWORD">
                <input style={inputStyle} type="password" placeholder="at least 6 characters" value={password} onChange={e => setPassword(e.target.value)} onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} onKeyDown={e => e.key === 'Enter' && submit()} />
              </Field>
            )}

            {mode === 'login' && (
              <button onClick={() => { setMode('forgot'); setError('') }} style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--sans)', textAlign: 'right', padding: 0, textDecoration: 'underline', alignSelf: 'flex-end', marginTop: -8 }}>
                Forgot password?
              </button>
            )}

            {mode === 'signup' && (
              <Field label="TRACK">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={track} onChange={e => setTrack(e.target.value)}>
                  {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            )}

            {error && (
              <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '9px 12px', borderRadius: 6, fontFamily: 'var(--mono)' }}>{error}</div>
            )}

            <button onClick={submit} disabled={loading} style={{ background: '#18181B', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'var(--sans)', opacity: loading ? 0.5 : 1, width: '100%', marginTop: 4 }}>
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Create account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReplyThread({ postId, profile, profileMap = {}, onViewUser }) {
  const [replies, setReplies] = useState([])
  const [body, setBody] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReplies() }, [postId])

  const fetchReplies = async () => {
    const { data } = await supabase.from('replies').select('*').eq('post_id', postId).order('created_at', { ascending: true })
    if (data) setReplies(data)
    setLoading(false)
  }

  const submit = async () => {
    if (!body.trim() || !profile) return
    setSubmitting(true)
    const { data, error } = await supabase.from('replies').insert({
      post_id: postId, body: body.trim(), author_id: profile.id,
      username: profile.username, display_name: profile.display_name,
      parent_id: replyingTo?.id || null, parent_username: replyingTo?.username || null,
    }).select().single()
    if (!error && data) {
      setReplies(prev => [...prev, data])
      await supabase.rpc('increment_reply_count', { post_id: postId })
    }
    setBody(''); setReplyingTo(null); setSubmitting(false)
  }

  const grouped = replies.reduce((acc, r) => {
    if (!r.parent_id) acc.push({ ...r, children: [] })
    else { const p = acc.find(x => x.id === r.parent_id); if (p) p.children.push(r); else acc.push({ ...r, children: [] }) }
    return acc
  }, [])

  const ReplyItem = ({ reply, depth = 0 }) => (
    <div style={{ marginLeft: depth > 0 ? 32 : 0, borderLeft: depth > 0 ? '2px solid #F0F0F0' : 'none', paddingLeft: depth > 0 ? 12 : 0 }}>
      <div style={{ padding: '10px 0', borderTop: depth === 0 ? '1px solid #F4F4F5' : 'none' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar name={reply.display_name || reply.username} size={28} url={profileMap[reply.author_id]?.avatar_url} onClick={() => onViewUser(reply.author_id)} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span onClick={() => onViewUser(reply.author_id)} style={{ fontSize: 13, fontWeight: 600, color: '#18181B', cursor: 'pointer' }}
                onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                {reply.display_name || reply.username}
              </span>
              <span style={{ fontSize: 11, color: '#A1A1AA', fontFamily: 'var(--mono)' }}>{timeAgo(reply.created_at)}</span>
              {reply.parent_username && depth === 0 && <span style={{ fontSize: 11, color: '#A1A1AA', fontFamily: 'var(--mono)' }}>replying to @{reply.parent_username}</span>}
            </div>
            <div style={{ fontSize: 14, color: '#3F3F46', lineHeight: 1.65 }}>{reply.body}</div>
            <button onClick={() => setReplyingTo({ id: reply.id, username: reply.username })} style={{ marginTop: 6, background: 'none', border: 'none', fontSize: 12, color: '#A1A1AA', cursor: 'pointer', fontFamily: 'var(--sans)', padding: 0, fontWeight: 500 }}>Reply</button>
          </div>
        </div>
      </div>
      {reply.children?.map(child => <ReplyItem key={child.id} reply={child} depth={depth + 1} />)}
    </div>
  )

  return (
    <div>
      {loading
        ? <div style={{ fontSize: 13, color: '#A1A1AA', padding: '12px 0' }}>Loading...</div>
        : grouped.map(r => <ReplyItem key={r.id} reply={r} />)
      }
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F4F4F5' }}>
        {replyingTo && (
          <div style={{ fontSize: 12, color: '#71717A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            Replying to <strong>@{replyingTo.username}</strong>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar name={profile?.display_name || profile?.username || '?'} size={28} url={profileMap[profile?.id]?.avatar_url} />
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
              placeholder="Write a reply... (Cmd+Enter to post)" rows={2}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E4E4E7', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', resize: 'none', lineHeight: 1.5, background: '#fff', color: '#18181B' }}
              onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} />
            <button onClick={submit} disabled={submitting || !body.trim()} style={{ background: '#18181B', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 500, cursor: body.trim() ? 'pointer' : 'default', fontFamily: 'var(--sans)', opacity: !body.trim() || submitting ? 0.35 : 1, flexShrink: 0 }}>Post</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ComposeModal({ profile, onClose, onPost }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('calc')
  const [track, setTrack] = useState(profile?.track || 'AP')
  const [type, setType] = useState('question')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!title.trim() || !body.trim()) return
    setSubmitting(true); setError('')
    const { data, error: err } = await supabase.from('posts').insert({
      title: title.trim(), body: body.trim(), subject, track, type,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      author_id: profile.id, username: profile.username, display_name: profile.display_name,
    }).select().single()
    if (err) { setError(err.message); setSubmitting(false); return }
    onPost(data); onClose()
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#18181B' }}>New post</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#A1A1AA', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {POST_TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)} style={{ padding: '6px 14px', borderRadius: 6, border: `1.5px solid ${type === t.id ? t.color : '#E4E4E7'}`, background: type === t.id ? t.bg : '#fff', color: type === t.id ? t.color : '#71717A', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="SUBJECT">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={subject} onChange={e => setSubject(e.target.value)}>
              {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="TRACK">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={track} onChange={e => setTrack(e.target.value)}>
              {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="TITLE">
          <input style={inputStyle} placeholder="What's the question or concept?" value={title} onChange={e => setTitle(e.target.value)} onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} />
        </Field>
        <Field label="BODY">
          <textarea style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} rows={7} placeholder="Explain your reasoning, what confused you, or the key insight..." value={body} onChange={e => setBody(e.target.value)} onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} />
        </Field>
        <Field label="TAGS — comma separated, optional">
          <input style={inputStyle} placeholder="limits, chain rule, enzyme kinetics" value={tags} onChange={e => setTags(e.target.value)} onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} />
        </Field>
        {error && <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '9px 12px', borderRadius: 6 }}>{error}</div>}
        <button onClick={submit} disabled={submitting || !title.trim() || !body.trim()} style={{ background: '#18181B', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 14, fontWeight: 500, width: '100%', cursor: (!title.trim() || !body.trim() || submitting) ? 'default' : 'pointer', fontFamily: 'var(--sans)', opacity: (!title.trim() || !body.trim() || submitting) ? 0.35 : 1 }}>
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  )
}

function PostCard({ post, profile, profileMap = {}, onUpvote, onDelete, onViewUser }) {
  const sub = SUBJECTS.find(s => s.id === post.subject) || SUBJECTS[0]
  const typ = POST_TYPES.find(t => t.id === post.type) || POST_TYPES[0]
  const [expanded, setExpanded] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const isUpvoted = post.upvoters?.includes(profile?.id)
  const isOwn = post.author_id === profile?.id
  const truncate = post.body.length > 320

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #E4E4E7', padding: '20px 24px 16px', display: 'flex', flexDirection: 'column', gap: 14, transition: 'border-color .15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#D4D4D8'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#E4E4E7'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar name={post.display_name || post.username} size={38} url={profileMap[post.author_id]?.avatar_url} onClick={() => onViewUser(post.author_id)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span onClick={() => onViewUser(post.author_id)} style={{ fontSize: 14, fontWeight: 600, color: '#18181B', cursor: 'pointer' }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>
              {post.display_name || post.username}
            </span>
            <span style={{ fontSize: 12, color: '#A1A1AA', fontFamily: 'var(--mono)' }}>@{post.username}</span>
            <span style={{ fontSize: 12, color: '#D4D4D8' }}>·</span>
            <span style={{ fontSize: 12, color: '#A1A1AA' }}>{timeAgo(post.created_at)}</span>
            <Pill label={typ.label} color={typ.color} bg={typ.bg} />
            <Pill label={sub.label} color={sub.color} bg={sub.bg} />
            <Pill label={post.track} color="#52525B" bg="#F4F4F5" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4, color: '#18181B', marginBottom: 8, letterSpacing: '-0.01em' }}>{post.title}</div>
          <div style={{ fontSize: 14.5, color: '#52525B', lineHeight: 1.75 }}>
            {expanded || !truncate ? post.body : post.body.slice(0, 320) + '...'}
            {truncate && <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: 13, padding: '0 4px', textDecoration: 'underline', fontFamily: 'var(--sans)' }}>{expanded ? 'less' : 'more'}</button>}
          </div>
          {post.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {post.tags.map(t => <span key={t} style={{ fontSize: 12, color: '#A1A1AA', fontFamily: 'var(--mono)' }}>#{t.replace(/\s+/g, '_')}</span>)}
            </div>
          )}
        </div>
        {isOwn && (
          <button onClick={() => onDelete(post.id)} style={{ background: 'none', border: 'none', color: '#D4D4D8', cursor: 'pointer', fontSize: 16, padding: '2px 4px', flexShrink: 0, borderRadius: 4 }}
            onMouseEnter={e => e.target.style.color = '#EF4444'} onMouseLeave={e => e.target.style.color = '#D4D4D8'}>×</button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, borderTop: '1px solid #F4F4F5' }}>
        <button onClick={() => onUpvote(post)} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${isUpvoted ? '#16A34A' : '#E4E4E7'}`, background: isUpvoted ? '#F0FDF4' : '#fff', color: isUpvoted ? '#16A34A' : '#71717A' }}>
          {post.upvotes ?? 0} {post.upvotes === 1 ? 'upvote' : 'upvotes'}
        </button>
        <button onClick={() => setShowReplies(!showReplies)} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${showReplies ? '#D4D4D8' : '#E4E4E7'}`, background: showReplies ? '#F4F4F5' : '#fff', color: '#71717A' }}>
          {post.reply_count ?? 0} {post.reply_count === 1 ? 'reply' : 'replies'}
        </button>
      </div>
      {showReplies && (
        <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: 8 }}>
          <ReplyThread postId={post.id} profile={profile} profileMap={profileMap} onViewUser={onViewUser} />
        </div>
      )}
    </div>
  )
}

function ProfileSidebar({ profile, posts, onLogout, onUpload, onUpdateBio }) {
  const myPosts = posts.filter(p => p.author_id === profile?.id)
  const totalUpvotes = myPosts.reduce((s, p) => s + (p.upvotes ?? 0), 0)
  const joined = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'
  const [editingBio, setEditingBio] = useState(false)
  const [bioText, setBioText] = useState(profile?.bio || '')

  const saveBio = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ bio: bioText.trim() })
      .eq('id', profile.id)
    if (error) { console.error('Bio save failed:', error.message); return }
    onUpdateBio(bioText.trim())
    setEditingBio(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 72 }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #E4E4E7', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16, gap: 10 }}>
          <AvatarUpload profile={profile} onUpload={onUpload} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#18181B' }}>{profile?.display_name || profile?.username}</div>
            <div style={{ fontSize: 12, color: '#A1A1AA', fontFamily: 'var(--mono)', marginTop: 2 }}>@{profile?.username}</div>
            {profile?.track && <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}><Pill label={profile.track} color="#4338CA" bg="#EEF2FF" /></div>}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          {editingBio ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea value={bioText} onChange={e => setBioText(e.target.value)} placeholder="Write a short bio..." rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid #E4E4E7', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', resize: 'none', lineHeight: 1.5, color: '#18181B' }}
                onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={saveBio} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: '#18181B', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Save</button>
                <button onClick={() => { setEditingBio(false); setBioText(profile?.bio || '') }} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: '1.5px solid #E4E4E7', background: '#fff', color: '#71717A', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditingBio(true)}
              style={{ cursor: 'pointer', padding: '8px 10px', borderRadius: 7, border: '1.5px dashed #E4E4E7', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#A1A1AA'} onMouseLeave={e => e.currentTarget.style.borderColor = '#E4E4E7'}>
              {profile?.bio
                ? <span style={{ fontSize: 13, color: '#52525B', lineHeight: 1.6, textAlign: 'center' }}>{profile.bio}</span>
                : <span style={{ fontSize: 12, color: '#A1A1AA', fontFamily: 'var(--mono)' }}>Add a bio...</span>}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[['Posts', myPosts.length], ['Upvotes', totalUpvotes]].map(([l, v]) => (
            <div key={l} style={{ background: '#FAFAFA', borderRadius: 8, padding: '12px 0', textAlign: 'center', border: '1px solid #F4F4F5' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#18181B', fontFamily: 'var(--mono)' }}>{v}</div>
              <div style={{ fontSize: 10, color: '#A1A1AA', fontFamily: 'var(--mono)', marginTop: 2, letterSpacing: '0.06em' }}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#A1A1AA', fontFamily: 'var(--mono)', textAlign: 'center', marginBottom: 12 }}>joined {joined}</div>
        <button onClick={onLogout} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1.5px solid #E4E4E7', background: '#fff', color: '#71717A', fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>Sign out</button>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [profileMap, setProfileMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [activeSubject, setActiveSubject] = useState('all')
  const [activeType, setActiveType] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('new')
  const [viewingUserId, setViewingUserId] = useState(null)
  const [showResetModal, setShowResetModal] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
        if (event === 'PASSWORD_RECOVERY') setShowResetModal(true)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  useEffect(() => {
    if (!session) return
    fetchPosts()
    const channel = supabase.channel('posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, p => setPosts(prev => [p.new, ...prev]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, p => setPosts(prev => prev.filter(x => x.id !== p.old.id)))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, p => setPosts(prev => prev.map(x => x.id === p.new.id ? p.new : x)))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session])

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) {
      setPosts(data)
      const ids = [...new Set(data.map(p => p.author_id).filter(Boolean))]
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, avatar_url, display_name, username').in('id', ids)
        if (profiles) { const map = {}; profiles.forEach(p => { map[p.id] = p }); setProfileMap(map) }
      }
    }
  }

  const handleUpvote = async (post) => {
    if (!profile) return
    const upvoters = post.upvoters || []
    const already = upvoters.includes(profile.id)
    const newUpvoters = already ? upvoters.filter(u => u !== profile.id) : [...upvoters, profile.id]
    const { data } = await supabase.from('posts').update({ upvotes: post.upvotes + (already ? -1 : 1), upvoters: newUpvoters }).eq('id', post.id).select().single()
    if (data) setPosts(prev => prev.map(p => p.id === data.id ? data : p))
  }

  const handleDelete = async (postId) => {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const handlePost = (newPost) => setPosts(prev => [newPost, ...prev])
  const handleLogout = () => supabase.auth.signOut()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA' }}>
      <span style={{ fontFamily: 'var(--mono)', color: '#A1A1AA', fontSize: 13 }}>loading...</span>
    </div>
  )

  if (!session) return <AuthScreen onAuth={() => {}} />

  let filtered = posts.filter(p => {
    if (activeSubject !== 'all' && p.subject !== activeSubject) return false
    if (activeType !== 'all' && p.type !== activeType) return false
    if (search) {
      const q = search.toLowerCase()
      return p.title?.toLowerCase().includes(q) || p.body?.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q))
    }
    return true
  })
  if (sort === 'top') filtered = [...filtered].sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        :root { --serif: 'Lora', serif; --sans: 'DM Sans', sans-serif; --mono: 'DM Mono', monospace; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body { font-family: var(--sans); background: #FAFAFA; color: #18181B; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #E4E4E7; border-radius: 4px; }
        button { transition: all .12s; } textarea, input, select { font-family: var(--sans); }
        @media (max-width: 900px) { .left-col, .right-col { display: none !important; } }
      `}</style>

      {composing && profile && <ComposeModal profile={profile} onClose={() => setComposing(false)} onPost={handlePost} />}
      {viewingUserId && <UserProfileModal userId={viewingUserId} currentProfile={profile} posts={posts} onClose={() => setViewingUserId(null)} />}
      {showResetModal && <ResetPasswordModal onDone={() => setShowResetModal(false)} />}

      <nav style={{ background: '#fff', borderBottom: '1.5px solid #E4E4E7', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: 20, height: 58 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', flexShrink: 0, color: '#18181B' }}>ThreadStack</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts..."
            style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #E4E4E7', fontSize: 14, fontFamily: 'var(--sans)', outline: 'none', background: '#FAFAFA', color: '#18181B' }}
            onFocus={e => e.target.style.borderColor = '#18181B'} onBlur={e => e.target.style.borderColor = '#E4E4E7'} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Avatar name={profile?.display_name || profile?.username || '?'} size={32} url={profile?.avatar_url} onClick={() => setViewingUserId(profile?.id)} />
            <span style={{ fontSize: 14, color: '#3F3F46', fontWeight: 500 }}>{profile?.display_name || profile?.username}</span>
            <button onClick={() => setComposing(true)} style={{ background: '#18181B', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', letterSpacing: '-0.01em' }}>New post</button>
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', height: 'calc(100vh - 58px)' }}>
        <div className="left-col" style={{ width: 200, flexShrink: 0, borderRight: '1.5px solid #E4E4E7', background: '#fff', overflowY: 'auto', padding: '20px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#A1A1AA', fontFamily: 'var(--mono)', marginBottom: 6, paddingLeft: 8 }}>SUBJECTS</div>
          {[{ id: 'all', label: 'All subjects', color: '#18181B', bg: '#F4F4F5' }, ...SUBJECTS].map(s => (
            <button key={s.id} onClick={() => setActiveSubject(s.id)} style={{ padding: '7px 10px', borderRadius: 7, textAlign: 'left', border: 'none', width: '100%', background: activeSubject === s.id ? s.bg : 'transparent', color: activeSubject === s.id ? s.color : '#52525B', fontSize: 13.5, fontWeight: activeSubject === s.id ? 600 : 400, cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 1, display: 'block' }}>{s.label}</button>
          ))}
          <div style={{ height: 18 }} />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#A1A1AA', fontFamily: 'var(--mono)', marginBottom: 6, paddingLeft: 8 }}>TYPE</div>
          {[{ id: 'all', label: 'All types', color: '#18181B', bg: '#F4F4F5' }, ...POST_TYPES].map(t => (
            <button key={t.id} onClick={() => setActiveType(t.id)} style={{ padding: '7px 10px', borderRadius: 7, textAlign: 'left', border: 'none', width: '100%', background: activeType === t.id ? (t.bg || '#F4F4F5') : 'transparent', color: activeType === t.id ? (t.color || '#18181B') : '#52525B', fontSize: 13.5, fontWeight: activeType === t.id ? 600 : 400, cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 1, display: 'block' }}>{t.label || 'All types'}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ display: 'flex', background: '#F4F4F5', borderRadius: 8, padding: 3 }}>
              {[['new', 'New'], ['top', 'Top']].map(([val, lbl]) => (
                <button key={val} onClick={() => setSort(val)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: sort === val ? '#fff' : 'transparent', color: sort === val ? '#18181B' : '#A1A1AA', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: sort === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{lbl}</button>
              ))}
            </div>
            <span style={{ fontSize: 13, color: '#A1A1AA', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>{filtered.length} post{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#A1A1AA', fontSize: 14 }}>
                {posts.length === 0
                  ? <><div style={{ marginBottom: 12, fontSize: 16, color: '#71717A' }}>No posts yet.</div><button onClick={() => setComposing(true)} style={{ background: '#18181B', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Write the first post</button></>
                  : 'No posts match your filters.'}
              </div>
            ) : filtered.map(post => (
              <PostCard key={post.id} post={post} profile={profile} profileMap={profileMap} onUpvote={handleUpvote} onDelete={handleDelete} onViewUser={setViewingUserId} />
            ))}
          </div>
        </div>

        <div className="right-col" style={{ width: 240, flexShrink: 0, borderLeft: '1.5px solid #E4E4E7', background: '#fff', overflowY: 'auto', padding: '20px 16px' }}>
          <ProfileSidebar profile={profile} posts={posts} onLogout={handleLogout}
            onUpload={(url) => {
              setProfile(p => ({ ...p, avatar_url: url }))
              setProfileMap(m => ({ ...m, [profile.id]: { ...m[profile.id], avatar_url: url } }))
            }}
            onUpdateBio={(bio) => setProfile(p => ({ ...p, bio }))}
          />
        </div>
      </div>
    </>
  )
}
