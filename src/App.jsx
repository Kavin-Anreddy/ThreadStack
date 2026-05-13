import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const SUBJECTS = [
  { id: 'calc',    label: 'Calculus',    color: '#C2410C', bg: '#FFF7ED' },
  { id: 'bio',     label: 'Biology',     color: '#15803D', bg: '#F0FDF4' },
  { id: 'chem',    label: 'Chemistry',   color: '#6D28D9', bg: '#F5F3FF' },
  { id: 'physics', label: 'Physics',     color: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'history', label: 'History',     color: '#92400E', bg: '#FFFBEB' },
  { id: 'cs',      label: 'Comp Sci',    color: '#BE185D', bg: '#FDF2F8' },
  { id: 'lit',     label: 'Literature',  color: '#065F46', bg: '#ECFDF5' },
  { id: 'stats',   label: 'Statistics',  color: '#4338CA', bg: '#EEF2FF' },
  { id: 'econ',    label: 'Economics',   color: '#9A3412', bg: '#FFF7ED' },
  { id: 'psych',   label: 'Psychology',  color: '#7C3AED', bg: '#F5F3FF' },
]
const TRACKS = ['AP', 'IB', 'College', 'USABO', 'AMC/AIME', 'SAT/ACT', 'Other']
const POST_TYPES = [
  { id: 'question',    label: 'Question',    color: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'explanation', label: 'Explanation', color: '#15803D', bg: '#F0FDF4' },
  { id: 'mistake',     label: 'Mistake',     color: '#C2410C', bg: '#FFF7ED' },
  { id: 'resource',    label: 'Resource',    color: '#6D28D9', bg: '#F5F3FF' },
]
const AVATAR_COLORS = ['#C2410C','#15803D','#6D28D9','#1D4ED8','#BE185D','#065F46','#92400E','#4338CA','#9A3412','#7C3AED']

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
      background: color + '15', border: `1px solid ${color}30`, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, fontFamily: 'var(--mono)', userSelect: 'none',
      overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
    }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials(name)
      }
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
      <Avatar name={profile.display_name || profile.username} size={64} url={profile.avatar_url} />
      <label style={{
        position: 'absolute', bottom: 0, right: 0,
        background: '#111', color: '#fff', borderRadius: '50%',
        width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: uploading ? 'default' : 'pointer', fontSize: 11, border: '2px solid #fff',
      }}>
        {uploading ? '...' : '+'}
        <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} disabled={uploading} />
      </label>
    </div>
  )
}

function Pill({ label, color, bg, small }) {
  return (
    <span style={{
      fontSize: small ? 10 : 11, padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 4, background: bg, color, fontWeight: 500,
      fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: '#777', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>{label}</label>}
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '9px 12px', borderRadius: 6, border: '1px solid #E0E0E0',
  fontSize: 14, fontFamily: 'var(--sans)', outline: 'none', background: '#fff',
  width: '100%', transition: 'border-color .15s',
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
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
      if (mode === 'signup') {
        if (!username.trim() || username.length < 3) { setError('Username must be 3+ characters.'); return }
        if (!/^[a-z0-9_]+$/.test(username)) { setError('Username: lowercase letters, numbers, underscores only.'); return }
        const { data: existing } = await supabase.from('profiles').select('username').eq('username', username).maybeSingle()
        if (existing) { setError('Username already taken.'); return }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { username, display_name: displayName.trim() || username, track } },
        })
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F8F6' }}>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 10 }}>Check your email</div>
        <div style={{ fontSize: 14, color: '#777', lineHeight: 1.6 }}>
          Confirmation sent to <strong>{email}</strong>. Click the link to activate your account, then sign in.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F8F6', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', color: '#111' }}>ThreadStack</div>
          <div style={{ fontSize: 13, color: '#AAA', marginTop: 4, fontFamily: 'var(--sans)' }}>study together</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '24px 24px 20px', border: '1px solid #E8E8E8' }}>
          <div style={{ display: 'flex', background: '#F3F3F3', borderRadius: 6, padding: 3, marginBottom: 20 }}>
            {[['login', 'Sign in'], ['signup', 'Create account']].map(([m, lbl]) => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '7px 0', borderRadius: 4, border: 'none',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#111' : '#999',
                fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>{lbl}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <Field label="USERNAME">
                <input style={inputStyle} placeholder="your_handle"
                  value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  onFocus={e => e.target.style.borderColor = '#999'} onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
              </Field>
            )}
            {mode === 'signup' && (
              <Field label="DISPLAY NAME">
                <input style={inputStyle} placeholder="How others see you"
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#999'} onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
              </Field>
            )}
            <Field label="EMAIL">
              <input style={inputStyle} type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#999'} onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </Field>
            <Field label="PASSWORD">
              <input style={inputStyle} type="password" placeholder="at least 6 characters"
                value={password} onChange={e => setPassword(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#999'} onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </Field>
            {mode === 'signup' && (
              <Field label="TRACK">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={track} onChange={e => setTrack(e.target.value)}>
                  {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            )}
            {error && (
              <div style={{ fontSize: 12, color: '#991B1B', background: '#FEF2F2', padding: '8px 10px', borderRadius: 5, fontFamily: 'var(--mono)' }}>{error}</div>
            )}
            <button onClick={submit} disabled={loading} style={{
              background: '#111', color: '#fff', border: 'none', borderRadius: 6,
              padding: '11px 0', fontSize: 13, fontWeight: 500,
              cursor: loading ? 'default' : 'pointer', fontFamily: 'var(--sans)',
              opacity: loading ? 0.5 : 1, width: '100%', marginTop: 2,
            }}>{loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReplyThread({ postId, profile, profileMap = {} }) {
  const [replies, setReplies] = useState([])
  const [body, setBody] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReplies()
  }, [postId])

  const fetchReplies = async () => {
    const { data } = await supabase
      .from('replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setReplies(data)
    setLoading(false)
  }

  const submit = async () => {
    if (!body.trim() || !profile) return
    setSubmitting(true)
    const { data, error } = await supabase.from('replies').insert({
      post_id: postId,
      body: body.trim(),
      author_id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      parent_id: replyingTo?.id || null,
      parent_username: replyingTo?.username || null,
    }).select().single()
    if (!error && data) {
      setReplies(prev => [...prev, data])
      await supabase.rpc('increment_reply_count', { post_id: postId })
    }
    setBody('')
    setReplyingTo(null)
    setSubmitting(false)
  }

  const grouped = replies.reduce((acc, r) => {
    if (!r.parent_id) { acc.push({ ...r, children: [] }) }
    else {
      const parent = acc.find(p => p.id === r.parent_id)
      if (parent) parent.children.push(r)
      else acc.push({ ...r, children: [] })
    }
    return acc
  }, [])

  const ReplyItem = ({ reply, depth = 0 }) => (
    <div style={{ marginLeft: depth > 0 ? 28 : 0 }}>
      <div style={{
        padding: '10px 0',
        borderTop: depth === 0 ? '1px solid #F0F0F0' : 'none',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {depth > 0 && <div style={{ width: 1, background: '#E0E0E0', alignSelf: 'stretch', marginRight: 6, flexShrink: 0 }} />}
          <Avatar name={reply.display_name || reply.username} size={26} url={profileMap[reply.author_id]?.avatar_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)' }}>{reply.display_name || reply.username}</span>
              <span style={{ fontSize: 11, color: '#BBB', fontFamily: 'var(--mono)' }}>{timeAgo(reply.created_at)}</span>
            </div>
            {reply.parent_username && depth === 0 && (
              <div style={{ fontSize: 11, color: '#AAA', fontFamily: 'var(--mono)', marginBottom: 3 }}>
                replying to @{reply.parent_username}
              </div>
            )}
            <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.65 }}>{reply.body}</div>
            <button onClick={() => setReplyingTo({ id: reply.id, username: reply.username })}
              style={{ marginTop: 5, background: 'none', border: 'none', fontSize: 11, color: '#AAA', cursor: 'pointer', fontFamily: 'var(--mono)', padding: 0 }}>
              reply
            </button>
          </div>
        </div>
      </div>
      {reply.children?.map(child => <ReplyItem key={child.id} reply={child} depth={depth + 1} />)}
    </div>
  )

  return (
    <div style={{ marginTop: 4 }}>
      {loading ? (
        <div style={{ fontSize: 12, color: '#CCC', fontFamily: 'var(--mono)', padding: '8px 0' }}>loading replies...</div>
      ) : (
        grouped.map(r => <ReplyItem key={r.id} reply={r} />)
      )}

      {/* Compose reply */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F0F0' }}>
        {replyingTo && (
          <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--mono)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            replying to @{replyingTo.username}
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#BBB', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>x</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Avatar name={profile?.display_name || profile?.username || '?'} size={26} />
          <div style={{ flex: 1 }}>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
              placeholder="Write a reply..."
              rows={2}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6,
                border: '1px solid #E0E0E0', fontSize: 13, fontFamily: 'var(--sans)',
                outline: 'none', resize: 'none', lineHeight: 1.5, background: '#fff',
              }}
              onFocus={e => e.target.style.borderColor = '#999'}
              onBlur={e => e.target.style.borderColor = '#E0E0E0'}
            />
          </div>
          <button onClick={submit} disabled={submitting || !body.trim()} style={{
            background: '#111', color: '#fff', border: 'none', borderRadius: 6,
            padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: body.trim() ? 'pointer' : 'default',
            fontFamily: 'var(--sans)', opacity: !body.trim() || submitting ? 0.4 : 1, flexShrink: 0,
          }}>Post</button>
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
      title: title.trim(), body: body.trim(),
      subject, track, type,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      author_id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
    }).select().single()
    if (err) { setError(err.message); setSubmitting(false); return }
    onPost(data)
    onClose()
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: '22px 24px 20px',
        width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--sans)' }}>New post</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#BBB', lineHeight: 1 }}>x</button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {POST_TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)} style={{
              padding: '5px 12px', borderRadius: 4,
              border: `1px solid ${type === t.id ? t.color : '#E0E0E0'}`,
              background: type === t.id ? t.bg : '#fff',
              color: type === t.id ? t.color : '#888',
              fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
          <input style={inputStyle} placeholder="What's the concept, question, or mistake?"
            value={title} onChange={e => setTitle(e.target.value)}
            onFocus={e => e.target.style.borderColor = '#999'} onBlur={e => e.target.style.borderColor = '#E0E0E0'} />
        </Field>

        <Field label="BODY">
          <textarea style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} rows={6}
            placeholder="Explain your reasoning, what confused you, or the key insight..."
            value={body} onChange={e => setBody(e.target.value)}
            onFocus={e => e.target.style.borderColor = '#999'} onBlur={e => e.target.style.borderColor = '#E0E0E0'} />
        </Field>

        <Field label="TAGS (comma separated, optional)">
          <input style={inputStyle} placeholder="limits, chain rule, enzyme kinetics"
            value={tags} onChange={e => setTags(e.target.value)}
            onFocus={e => e.target.style.borderColor = '#999'} onBlur={e => e.target.style.borderColor = '#E0E0E0'} />
        </Field>

        {error && <div style={{ fontSize: 12, color: '#991B1B', background: '#FEF2F2', padding: '8px 10px', borderRadius: 5, fontFamily: 'var(--mono)' }}>{error}</div>}

        <button onClick={submit} disabled={submitting || !title.trim() || !body.trim()} style={{
          background: '#111', color: '#fff', border: 'none', borderRadius: 6,
          padding: '11px 0', fontSize: 13, fontWeight: 500, width: '100%',
          cursor: (!title.trim() || !body.trim() || submitting) ? 'default' : 'pointer',
          fontFamily: 'var(--sans)', opacity: (!title.trim() || !body.trim() || submitting) ? 0.4 : 1,
        }}>{submitting ? 'Posting...' : 'Post'}</button>
      </div>
    </div>
  )
}

function PostCard({ post, profile, profileMap = {}, onUpvote, onDelete }) {
  const sub = SUBJECTS.find(s => s.id === post.subject) || SUBJECTS[0]
  const typ = POST_TYPES.find(t => t.id === post.type) || POST_TYPES[0]
  const [expanded, setExpanded] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const isUpvoted = post.upvoters?.includes(profile?.id)
  const isOwn = post.author_id === profile?.id
  const truncate = post.body.length > 280

  return (
    <div style={{
      background: '#fff', borderRadius: 8, border: '1px solid #E8E8E8',
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Avatar name={post.display_name || post.username} size={30} url={profileMap[post.author_id]?.avatar_url} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)' }}>{post.display_name || post.username}</span>
            <span style={{ fontSize: 11, color: '#BBB', fontFamily: 'var(--mono)' }}>@{post.username}</span>
            <span style={{ fontSize: 11, color: '#CCC' }}>·</span>
            <span style={{ fontSize: 11, color: '#BBB' }}>{timeAgo(post.created_at)}</span>
            <div style={{ display: 'flex', gap: 4, marginLeft: 2 }}>
              <Pill label={typ.label} color={typ.color} bg={typ.bg} small />
              <Pill label={sub.label} color={sub.color} bg={sub.bg} small />
              <Pill label={post.track} color="#666" bg="#F0F0F0" small />
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: '#111', marginBottom: 6 }}>{post.title}</div>
          <div style={{ fontSize: 13.5, color: '#444', lineHeight: 1.7 }}>
            {expanded || !truncate ? post.body : post.body.slice(0, 280) + '...'}
            {truncate && (
              <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: '0 4px', textDecoration: 'underline' }}>
                {expanded ? 'less' : 'more'}
              </button>
            )}
          </div>
          {post.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {post.tags.map(t => <span key={t} style={{ fontSize: 11, color: '#AAA', fontFamily: 'var(--mono)' }}>#{t.replace(/\s+/g, '_')}</span>)}
            </div>
          )}
        </div>
        {isOwn && (
          <button onClick={() => onDelete(post.id)}
            style={{ background: 'none', border: 'none', color: '#DDD', cursor: 'pointer', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}
            onMouseEnter={e => e.target.style.color = '#EF4444'}
            onMouseLeave={e => e.target.style.color = '#DDD'}>x</button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4, borderTop: '1px solid #F5F5F5' }}>
        <button onClick={() => onUpvote(post)} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
          borderRadius: 4, border: `1px solid ${isUpvoted ? '#15803D' : '#E8E8E8'}`,
          background: isUpvoted ? '#F0FDF4' : '#fff', color: isUpvoted ? '#15803D' : '#888',
          fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer',
        }}>
          {post.upvotes ?? 0} upvotes
        </button>

        <button onClick={() => setShowReplies(!showReplies)} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
          borderRadius: 4, border: '1px solid #E8E8E8',
          background: showReplies ? '#F5F5F5' : '#fff', color: '#888',
          fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer',
        }}>
          {post.reply_count ?? 0} {post.reply_count === 1 ? 'reply' : 'replies'}
        </button>
      </div>

      {showReplies && (
        <div style={{ borderTop: '1px solid #F0F0F0', paddingTop: 4 }}>
          <ReplyThread postId={post.id} profile={profile} profileMap={profileMap} />
        </div>
      )}
    </div>
  )
}

function ProfileSidebar({ profile, posts, onLogout, onUpload }) {
  const myPosts = posts.filter(p => p.author_id === profile?.id)
  const totalUpvotes = myPosts.reduce((s, p) => s + (p.upvotes ?? 0), 0)
  const joined = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E8E8E8', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <AvatarUpload profile={profile} onUpload={onUpload} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--sans)' }}>{profile?.display_name || profile?.username}</div>
            <div style={{ fontSize: 11, color: '#AAA', fontFamily: 'var(--mono)' }}>@{profile?.username}</div>
            {profile?.track && <div style={{ marginTop: 4 }}><Pill label={profile.track} color="#4338CA" bg="#EEF2FF" small /></div>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          {[['Posts', myPosts.length], ['Upvotes', totalUpvotes]].map(([l, v]) => (
            <div key={l} style={{ background: '#F8F8F8', borderRadius: 6, padding: '8px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)', color: '#111' }}>{v}</div>
              <div style={{ fontSize: 10, color: '#BBB', fontFamily: 'var(--mono)', marginTop: 1 }}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#CCC', fontFamily: 'var(--mono)', marginBottom: 10 }}>joined {joined}</div>
        <button onClick={onLogout} style={{
          width: '100%', padding: '7px 0', borderRadius: 6,
          border: '1px solid #E8E8E8', background: '#fff',
          color: '#888', fontFamily: 'var(--sans)', fontSize: 12, cursor: 'pointer',
        }}>Sign out</button>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
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
        if (profiles) {
          const map = {}
          profiles.forEach(p => { map[p.id] = p })
          setProfileMap(map)
        }
      }
    }
  }

  const handleUpvote = async (post) => {
    if (!profile) return
    const upvoters = post.upvoters || []
    const already = upvoters.includes(profile.id)
    const newUpvoters = already ? upvoters.filter(u => u !== profile.id) : [...upvoters, profile.id]
    const { data } = await supabase.from('posts')
      .update({ upvotes: post.upvotes + (already ? -1 : 1), upvoters: newUpvoters })
      .eq('id', post.id).select().single()
    if (data) setPosts(prev => prev.map(p => p.id === data.id ? data : p))
  }

  const handleDelete = async (postId) => {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const handlePost = (newPost) => setPosts(prev => [newPost, ...prev])
  const handleLogout = () => supabase.auth.signOut()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F8F6' }}>
      <span style={{ fontFamily: 'var(--mono)', color: '#CCC', fontSize: 13 }}>loading...</span>
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
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        :root { --serif: 'Lora', serif; --sans: 'Inter', sans-serif; --mono: 'IBM Plex Mono', monospace; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--sans); background: #F8F8F6; color: #111; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #E0E0E0; border-radius: 4px; }
        button { transition: opacity .1s, background .1s, border-color .1s; }
        @media (max-width: 780px) { .main-grid { grid-template-columns: 1fr !important; } .left-sidebar, .right-sidebar { display: none !important; } }
      `}</style>

      {composing && profile && <ComposeModal profile={profile} onClose={() => setComposing(false)} onPost={handlePost} />}

      <nav style={{ background: '#fff', borderBottom: '1px solid #E8E8E8', position: 'sticky', top: 0, zIndex: 100, padding: '0 20px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14, height: 52 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400, letterSpacing: '-0.01em', flexShrink: 0, color: '#111' }}>ThreadStack</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts..."
            style={{ flex: 1, maxWidth: 320, padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', background: '#F8F8F8' }}
            onFocus={e => e.target.style.borderColor = '#999'} onBlur={e => e.target.style.borderColor = '#E0E0E0'} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={profile?.display_name || profile?.username || '?'} size={26} url={profile?.avatar_url} />
            <span style={{ fontSize: 13, fontFamily: 'var(--sans)', color: '#555', fontWeight: 500 }}>{profile?.display_name || profile?.username}</span>
            <button onClick={() => setComposing(true)} style={{
              background: '#111', color: '#fff', border: 'none', padding: '6px 14px',
              borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--sans)', flexShrink: 0
            }}>New post</button>
          </div>
        </div>
      </nav>

      <div className="main-grid" style={{ maxWidth: 1060, margin: '0 auto', padding: '20px 20px', display: 'grid', gridTemplateColumns: '160px 1fr 180px', gap: 20 }}>

        <div className="left-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#BBB', fontFamily: 'var(--mono)', padding: '0 8px 8px' }}>SUBJECTS</div>
          {[{ id: 'all', label: 'All', color: '#111', bg: '#F0F0F0' }, ...SUBJECTS].map(s => (
            <button key={s.id} onClick={() => setActiveSubject(s.id)} style={{
              padding: '6px 8px', borderRadius: 5, textAlign: 'left', border: 'none',
              background: activeSubject === s.id ? s.bg : 'transparent',
              color: activeSubject === s.id ? s.color : '#666',
              fontSize: 13, fontWeight: activeSubject === s.id ? 500 : 400,
              cursor: 'pointer', fontFamily: 'var(--sans)',
            }}>{s.label}</button>
          ))}
          <div style={{ height: 12 }} />
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#BBB', fontFamily: 'var(--mono)', padding: '0 8px 8px' }}>TYPE</div>
          {[{ id: 'all', label: 'All' }, ...POST_TYPES].map(t => (
            <button key={t.id} onClick={() => setActiveType(t.id)} style={{
              padding: '6px 8px', borderRadius: 5, textAlign: 'left', border: 'none',
              background: activeType === t.id ? (t.bg || '#F0F0F0') : 'transparent',
              color: activeType === t.id ? (t.color || '#111') : '#666',
              fontSize: 12, fontWeight: activeType === t.id ? 500 : 400,
              cursor: 'pointer', fontFamily: 'var(--sans)',
            }}>{t.label || 'All'}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: '#EFEFEF', borderRadius: 6, padding: 2 }}>
              {[['new', 'New'], ['top', 'Top']].map(([val, lbl]) => (
                <button key={val} onClick={() => setSort(val)} style={{
                  padding: '4px 12px', borderRadius: 4, border: 'none',
                  background: sort === val ? '#fff' : 'transparent',
                  color: sort === val ? '#111' : '#999',
                  fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  boxShadow: sort === val ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{lbl}</button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: '#CCC', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
              {filtered.length} post{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#CCC', fontFamily: 'var(--sans)', fontSize: 13 }}>
              {posts.length === 0
                ? <><div style={{ marginBottom: 10 }}>No posts yet.</div><button onClick={() => setComposing(true)} style={{ background: 'none', border: '1px solid #E0E0E0', borderRadius: 6, padding: '7px 16px', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Write the first post</button></>
                : 'No posts match your filters.'}
            </div>
          ) : (
            filtered.map(post => (
              <PostCard key={post.id} post={post} profile={profile} profileMap={profileMap} onUpvote={handleUpvote} onDelete={handleDelete} />
            ))
          )}
        </div>

        <div className="right-sidebar">
          <ProfileSidebar profile={profile} posts={posts} onLogout={handleLogout} onUpload={(url) => {
            setProfile(p => ({ ...p, avatar_url: url }))
            setProfileMap(m => ({ ...m, [profile.id]: { ...m[profile.id], avatar_url: url } }))
          }} />
        </div>
      </div>
    </>
  )
}
